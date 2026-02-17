import { motion } from "framer-motion";
import { Coins, Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCredits, useToggleAdOptIn, useCreditTransactions } from "@/hooks/useCredits";

const CreditsDashboard = () => {
  const { data: credits } = useCredits();
  const { data: transactions = [] } = useCreditTransactions();
  const toggleOptIn = useToggleAdOptIn();

  const handleToggle = (checked: boolean) => {
    toggleOptIn.mutate(checked);
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          <h3 className="font-display text-base font-medium text-foreground">Credits</h3>
        </div>
        <span className="font-display text-xl font-semibold text-foreground">
          {credits?.balance ?? 0}
        </span>
      </div>

      {/* Ad opt-in */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border mb-4">
        <div className="flex-1 mr-3">
          <p className="text-xs font-medium text-foreground">Earn credits</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Opt in to see curated promotions and earn credits for premium features
          </p>
        </div>
        <Switch
          checked={credits?.ad_opt_in ?? false}
          onCheckedChange={handleToggle}
          disabled={toggleOptIn.isPending}
        />
      </div>

      {/* Transparency note */}
      <div className="flex items-start gap-2 mb-4">
        <Eye className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          You're never the product. Promotions are clearly labeled, and opting out has zero effect on your experience.
        </p>
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Recent</p>
          <div className="space-y-1.5">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  {tx.amount > 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-destructive" />
                  )}
                  <span className="text-muted-foreground truncate max-w-[160px]">
                    {tx.description || tx.type}
                  </span>
                </div>
                <span
                  className={`font-medium ${
                    tx.amount > 0 ? "text-green-600" : "text-destructive"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditsDashboard;
