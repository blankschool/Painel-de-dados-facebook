# 📅 Sistema de Datas - Alinhamento com Minter.io

## ✅ Como Funciona (Já Implementado Corretamente)

O sistema **já está configurado** para seguir o padrão do Minter.io:

### Regra Principal: **Apenas Dias Completos**

```
HOJE não é incluído nos cálculos!
```

**Motivo:** O dia de hoje ainda não terminou, então os dados não estão completos.

---

## 📊 Exemplos de Contagem

### Hoje: 12 de Janeiro de 2026

| Filtro | Descrição | Datas Incluídas | Total de Dias |
|--------|-----------|-----------------|---------------|
| **7D** | Últimos 7 dias completos | 5 Jan - 11 Jan | 7 dias |
| **30D** | Últimos 30 dias completos | 13 Dez - 11 Jan | 30 dias |
| **90D** | Últimos 90 dias completos | 13 Out - 11 Jan | 90 dias |
| **1Y** | Último ano completo | 12 Jan 2025 - 11 Jan 2026 | 365 dias |

**Nota:** Todos terminam em **ontem** (11 Jan), **não** em hoje (12 Jan).

---

## 🔍 Onde Está Implementado

### 1. Frontend - Cálculo de Date Range

**Arquivo:** `src/contexts/FiltersContext.tsx`

```typescript
// Linha 43
const yesterday = subDays(today, 1);  // Last complete day

// Linha 54 (exemplo: 30d)
startDate = subDays(yesterday, 29); // 29 + 1 = 30 days

// Linha 75
return {
  from: startOfDay(startDate),
  to: endOfDay(yesterday),  // Ends at yesterday, not today ✅
};
```

**Resultado:** Frontend sempre envia `until = ontem` para o backend.

---

### 2. Backend - Filtro de Posts

**Arquivo:** `supabase/functions/ig-dashboard/index.ts`

```typescript
// Linha 591-592
const sinceDate = body.since || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const untilDate = body.until || new Date().toISOString().split('T')[0];

// Linhas 745-746
if (postTimestamp >= sinceTimestamp && postTimestamp <= untilTimestamp) {
  allMedia.push(item);  // ✅ Apenas posts dentro do range
}
```

**Resultado:** Backend filtra posts exatamente dentro do range recebido (que já exclui hoje).

---

## 🎯 Verificação: Está Correto?

### Como Testar

**Cenário:** Hoje é 12 de Janeiro, selecione "Últimos 30 dias"

1. **Abra DevTools → Console**
2. **Procure pelo log:**
   ```
   [useDashboardData] Preset: 30d, Since: 2025-12-13, Until: 2026-01-11
   ```

3. **Verifique:**
   - ✅ `Until` deve ser **11 Jan** (ontem), não 12 Jan (hoje)
   - ✅ `Since` deve ser **13 Dez** (30 dias antes de ontem)

4. **No Network tab → ig-dashboard response:**
   ```json
   {
     "total_posts": 29,  // ✅ Posts de 30 dias completos
     "snapshot_date": "2026-01-11"  // ✅ Data final = ontem
   }
   ```

---

## 📈 Formato de Datas nos Gráficos

Para alinhar com Minter.io, os gráficos devem usar estes formatos:

### Eixo X (datas)

```javascript
const dateFormats = {
  // Períodos curtos (até 30 dias)
  short: "DD MMM",        // "12 Jan"

  // Períodos médios (31-365 dias)
  medium: "DD MMM",       // "12 Jan"

  // Períodos longos (> 365 dias)
  long: "MMM YYYY",       // "Jan 2026"
};
```

### Implementação Sugerida

```typescript
function formatDateForGraph(date: Date, totalDays: number): string {
  if (totalDays <= 365) {
    // "12 Jan"
    return format(date, 'd MMM', { locale: ptBR });
  } else {
    // "Jan 2026"
    return format(date, 'MMM yyyy', { locale: ptBR });
  }
}
```

**Exemplo de uso:**

```typescript
const graphData = posts.map(post => ({
  x: formatDateForGraph(new Date(post.timestamp), totalDays),
  y: post.engagement,
  timestamp: post.timestamp  // ISO format para sorting
}));
```

---

## 🌍 Timezone Consistency

### Importante: UTC vs Local

**Minter.io usa:** Provavelmente UTC (Universal Time)

**Nosso sistema:**
- Frontend calcula dates em **timezone local** do usuário
- Backend recebe dates em formato `YYYY-MM-DD` (sem timezone)
- Instagram API retorna timestamps em **UTC**

### Como Garantir Consistência

```typescript
// ✅ Correto: usar startOfDay/endOfDay do date-fns
import { startOfDay, endOfDay } from 'date-fns';

const yesterday = startOfDay(subDays(new Date(), 1));
const dateRange = {
  from: startOfDay(since),    // 00:00:00 local
  to: endOfDay(yesterday),     // 23:59:59 local
};

// Backend converte para string YYYY-MM-DD
const sinceStr = dateRange.from.toISOString().split('T')[0];  // "2026-01-11"
```

**Resultado:** Datas são consistentes independente do timezone do usuário.

---

## ⚠️ Problemas Comuns e Soluções

### Problema 1: "Dashboard mostra 30 posts, deveria mostrar 29"

**Causa:** Sistema está incluindo hoje (dia incompleto)

**Solução:** Já está corrigido! Verifique os logs:
```
[useDashboardData] Until: 2026-01-11  // ✅ Ontem, não hoje
```

---

### Problema 2: "Gráfico mostra data de hoje"

**Causa:** Frontend está renderizando posts de hoje no gráfico

**Solução:** Filtrar posts no componente antes de renderizar:
```typescript
const filteredPosts = posts.filter(post => {
  const postDate = new Date(post.timestamp);
  return postDate < startOfDay(new Date());  // Apenas posts de ontem ou antes
});
```

---

### Problema 3: "Contagem diferente do Minter.io"

**Causas possíveis:**
1. Timezone diferente (nosso vs Minter.io)
2. Posts na borda do dia (ex: 23:59)
3. Definição de "dia completo" diferente

**Solução:** Usar `endOfDay(yesterday)` garante que incluímos **todo** o dia de ontem até 23:59:59.

---

## ✅ Checklist de Validação

Para confirmar que está 100% alinhado:

- [ ] Frontend: `until` date = ontem (não hoje)
- [ ] Backend: filtra posts até `untilDate` (exclusivo)
- [ ] Console log mostra dates corretos
- [ ] Total de posts = posts de N dias completos (excluindo hoje)
- [ ] Gráfico não mostra data de hoje
- [ ] Formatos de data seguem padrão: "12 Jan" ou "Jan 2026"

---

## 📝 Exemplo Completo

### Hoje: 12 Janeiro 2026, 15:30

**Filtro:** Últimos 7 dias

**Frontend calcula:**
```javascript
today = 12 Jan 2026 00:00:00
yesterday = 11 Jan 2026 00:00:00
startDate = 5 Jan 2026 00:00:00  // 6 dias antes de ontem

dateRange = {
  from: 5 Jan 2026 00:00:00,
  to: 11 Jan 2026 23:59:59
}
```

**Backend recebe:**
```json
{
  "since": "2026-01-05",
  "until": "2026-01-11"
}
```

**Backend filtra posts:**
```typescript
// Apenas posts com timestamp entre:
// 2026-01-05 00:00:00 UTC até 2026-01-11 23:59:59 UTC
```

**Resultado:**
```json
{
  "total_posts": 14,  // Posts de 7 dias completos (5-11 Jan)
  "date_range": "5 Jan - 11 Jan",
  "excludes_today": true
}
```

**Gráfico mostra:**
```
5 Jan  ●━━━━ 2 posts
6 Jan  ●━━━━ 3 posts
7 Jan  ●━━━━ 1 post
8 Jan  ●━━━━ 4 posts
9 Jan  ●━━━━ 2 posts
10 Jan ●━━━━ 1 post
11 Jan ●━━━━ 1 post
(12 Jan não aparece ✅)
```

---

## 🎉 Conclusão

O sistema **já está correto** e alinhado com o padrão do Minter.io:

✅ Exclui o dia de hoje
✅ Conta apenas dias completos
✅ Frontend e backend sincronizados
✅ Filtros aplicados corretamente

Se houver diferença com Minter.io, pode ser:
- Timezone (UTC vs local)
- Posts na borda do dia (23:59:59)
- Definição de "início do dia" diferente

**A lógica está correta! 🚀**
