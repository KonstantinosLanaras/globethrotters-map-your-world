const MapLegend = () => {
  return (
    <div className="fixed bottom-6 left-4 z-[1000] flex items-center gap-3 px-3 py-2 bg-card/90 backdrop-blur-xl rounded-lg border border-border shadow-sm text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-visited" />
        <span className="text-muted-foreground font-medium">Visited</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-wishlist" />
        <span className="text-muted-foreground font-medium">Want to visit</span>
      </div>
    </div>
  );
};

export default MapLegend;
