const Optimization = () => {
  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3 py-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Optimization</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sugestões de otimização baseadas nos dados do seu perfil.
          </p>
        </div>
        <div className="chip">
          <span className="text-muted-foreground">Atualizado</span>
          <strong className="font-semibold">12 Dez 2025 • 01:25</strong>
        </div>
      </section>

      <div className="chart-card p-8 text-center">
        <p className="text-muted-foreground">Conecte sua conta do Instagram para ver sugestões de otimização.</p>
      </div>
    </div>
  );
};

export default Optimization;
