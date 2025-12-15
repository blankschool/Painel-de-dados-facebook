const Posts = () => {
  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3 py-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Posts</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Performance de posts por tipo (photos, carousels, reels) e top posts.
          </p>
        </div>
        <div className="chip">
          <span className="text-muted-foreground">Atualizado</span>
          <strong className="font-semibold">12 Dez 2025 • 01:16</strong>
        </div>
      </section>

      <div className="chart-card p-8 text-center">
        <p className="text-muted-foreground">Conecte sua conta do Instagram para ver a análise de posts.</p>
      </div>
    </div>
  );
};

export default Posts;
