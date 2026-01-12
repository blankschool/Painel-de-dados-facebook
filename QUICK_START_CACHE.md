# 🚀 Quick Start: Ativar Sistema de Cache

## ⚡ Passo a Passo (5 minutos)

### 1. Aplicar Migration no Supabase

**Opção A: Pela Interface Web** (Recomendado)

1. Abra o SQL Editor do Supabase:
   👉 https://supabase.com/dashboard/project/phbwmfjrgadzybqpjnoi/sql/new

2. Copie TODO o conteúdo do arquivo:
   ```
   supabase/migrations/20260112160900_create_instagram_cache.sql
   ```

3. Cole no editor SQL e clique em **"Run"**

4. Aguarde completar (deve levar ~5-10 segundos)

5. ✅ Pronto! As tabelas foram criadas

---

**Opção B: Pela CLI** (Se preferir)

```bash
# No terminal, dentro do projeto:
supabase db push
```

---

### 2. Verificar se Funcionou

No SQL Editor, execute:

```sql
-- Deve retornar 4 tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'instagram_%'
ORDER BY table_name;
```

Deve mostrar:
```
instagram_cache_metadata
instagram_daily_insights
instagram_posts_cache
instagram_profile_snapshots
```

---

### 3. Testar o Cache

1. **Primeiro acesso ao dashboard:**
   - Vai demorar ~30-90 segundos (normal, está buscando da API e salvando no cache)
   - Veja no console do navegador:
     ```
     [ig-dashboard] 🌐 Fetching fresh data from Instagram API...
     [ig-dashboard] 💾 Saving data to cache...
     [ig-dashboard] ✅ Data saved to cache successfully
     ```

2. **Recarregue a página (F5):**
   - Agora deve carregar em < 1 segundo! ⚡
   - Veja no console:
     ```
     [ig-dashboard] ⚡ Using cached data (0.5h old)
     [cache] Found 327 cached posts
     ```

3. **Confirme no response:**
   - Abra DevTools → Network → ig-dashboard
   - No response JSON, deve ter:
     ```json
     {
       "from_cache": true,
       "cache_age_hours": 0.5,
       "duration_ms": 450,
       "provider": "instagram_cache",
       "messages": ["⚡ Loaded from cache (0.5h old)"]
     }
     ```

---

## 🎯 Como Funciona Agora

### Primeira Vez (Cache Vazio)
```
Dashboard → Edge Function → Instagram API (60s)
                         → Salva no Supabase
                         → Retorna dados
```

### Próximas Vezes (Cache Fresh)
```
Dashboard → Edge Function → Supabase Database (< 1s)
                         → Retorna dados
```

### Após 24 Horas (Cache Vencido)
```
Dashboard → Edge Function → Instagram API (60s)
                         → Atualiza Supabase
                         → Retorna dados atualizados
```

---

## 🔧 Configurações

### Alterar Tempo de Cache (Opcional)

No arquivo `supabase/functions/ig-dashboard/index.ts`, linha ~609:

```typescript
const cacheStatus = await cache.checkCacheStatus(supabaseService, connectedAccount.id, {
  maxAgeHours: 24,  // ← Altere aqui (em horas)
  forceRefresh: body.forceRefresh === true,
});
```

Sugestões:
- `1` = Atualiza a cada 1 hora (mais fresco, mais API calls)
- `12` = Atualiza a cada 12 horas (balanceado)
- `24` = Atualiza 1x por dia (padrão, recomendado)
- `48` = Atualiza a cada 2 dias (menos API calls)

---

## 🐛 Troubleshooting

### "Tables already exist"
Se der erro de tabela já existente, ignore - significa que já foi aplicado.

### Cache não está funcionando
1. Verifique se as tabelas foram criadas (passo 2 acima)
2. Veja os logs do Edge Function no Supabase Dashboard
3. Limpe o cache e tente novamente:
   ```sql
   -- Cuidado: deleta todo o cache!
   TRUNCATE instagram_cache_metadata CASCADE;
   ```

### Dados desatualizados
Para forçar atualização imediata:
```javascript
// No código frontend, adicione:
body: {
  ...existingBody,
  forceRefresh: true  // ← Força buscar da API
}
```

---

## 📊 Monitorar o Cache

### Ver quantos posts estão cached:
```sql
SELECT
  ca.account_username,
  cm.total_posts_cached,
  cm.last_posts_sync,
  EXTRACT(EPOCH FROM (NOW() - cm.last_posts_sync)) / 3600 AS hours_since_sync
FROM instagram_cache_metadata cm
JOIN connected_accounts ca ON ca.id = cm.account_id;
```

### Ver posts mais recentes no cache:
```sql
SELECT
  media_id,
  caption,
  timestamp,
  reach,
  impressions,
  last_fetched_at
FROM instagram_posts_cache
WHERE account_id = 'YOUR_ACCOUNT_ID_HERE'
ORDER BY timestamp DESC
LIMIT 10;
```

### Ver evolução de seguidores:
```sql
SELECT
  snapshot_date,
  followers_count,
  media_count
FROM instagram_profile_snapshots
WHERE account_id = 'YOUR_ACCOUNT_ID_HERE'
ORDER BY snapshot_date DESC
LIMIT 30;
```

---

## ✅ Checklist Final

- [ ] Migration aplicada no Supabase
- [ ] 4 tabelas criadas (verificado)
- [ ] Primeira carga demorou ~60s (normal)
- [ ] Segunda carga foi instantânea (< 1s) ✨
- [ ] `from_cache: true` aparece no response
- [ ] Dashboard está carregando rápido!

---

## 📚 Documentação Completa

Para entender mais sobre o sistema de cache, veja:
- [CACHE_SYSTEM.md](./CACHE_SYSTEM.md) - Documentação técnica completa

---

**Tudo pronto! Agora seu dashboard carrega em < 1 segundo! 🚀**
