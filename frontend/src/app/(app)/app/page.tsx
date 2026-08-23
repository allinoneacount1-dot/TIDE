"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useReadContracts } from "wagmi";
import type { Address } from "viem";

import { AppHeader } from "@/components/app/AppHeader";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { ConnectButton } from "@/components/wallet/ConnectSheet";
import { CreateVault } from "@/components/app/CreateVault";
import { NowNext } from "@/components/app/NowNext";
import { CapitalRail } from "@/components/app/CapitalRail";
import { PlanTable } from "@/components/app/PlanTable";
import dynamic from "next/dynamic";
import { ExposureTable } from "@/components/app/ExposureTable";
import { ExecutionLedger } from "@/components/app/ExecutionLedger";
import { VaultProvenance } from "@/components/app/VaultProvenance";
import { DepositDrawer } from "@/components/app/DepositDrawer";
import { WithdrawDrawer, type WithdrawableAsset } from "@/components/app/WithdrawDrawer";
import { PlanDrawer } from "@/components/app/PlanDrawer";
import { ExecuteDrawer } from "@/components/app/ExecuteDrawer";
import { SignalRail } from "@/components/data/SignalRail";
import { Skeleton } from "@/components/primitives/Skeleton";
import { CycleDiagram } from "@/components/tide/CycleDiagram";

/**
 * The charts are below the fold and pull the heaviest dependencies on this route
 * — lightweight-charts, plus a third-party script for the market panel. Loading
 * them with the rest of the terminal delays the numbers a user opened the page
 * to read. Split out, they arrive while the reader is still at the top.
 */
const Performance = dynamic(
  () => import("@/components/app/Performance").then((m) => m.Performance),
  {
    ssr: false,
    loading: () => (
      <section className="border-b border-hairline" aria-label="Performance, loading">
        <div className="shell space-y-3 py-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </section>
    ),
  }
);

import {
  useAvailableTargets,
  useExecutions,
  useProtocolConfig,
  useToken,
  useTideChain,
  useUserVaults,
  useVault,
  useVaultExposure,
} from "@/hooks/useTide";
import { useTideTx } from "@/hooks/useTideTx";
import { useTxTracker } from "@/components/tx/TxProvider";
import { tideRegistryAbi, tideVaultAbi } from "@/lib/abi.generated";

type DrawerKind = "deposit" | "withdraw" | "plan" | "execute" | null;

/**
 * The terminal.
 *
 * Laid out as horizontal bands in decision order — now, capital, plans,
 * performance, exposure, execution, provenance — rather than as a grid of cards.
 * Each band answers one question and hands off to the next, so the page reads
 * top to bottom the way the user's attention actually moves: what is happening,
 * can it keep happening, what did it do, and can I verify it.
 */
export default function TerminalPage() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { deployment, configured } = useTideChain();

  const { vaults, isLoading: vaultsLoading, refetch: refetchVaults } = useUserVaults();
  const [activeVault, setActiveVault] = useState<Address | undefined>();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [busyPlanId, setBusyPlanId] = useState<number | null>(null);
  const [creatingVault, setCreatingVault] = useState(false);

  const tx = useTideTx();
  const tracker = useTxTracker();

  useEffect(() => {
    if (!activeVault && vaults.length > 0) setActiveVault(vaults[0]);
    if (activeVault && vaults.length > 0 && !vaults.includes(activeVault)) setActiveVault(vaults[0]);
  }, [vaults, activeVault]);

  const vault = useVault(activeVault);
  const exposure = useVaultExposure(activeVault);
  const executions = useExecutions(activeVault);
  const protocol = useProtocolConfig(deployment);
  const { token: quoteToken } = useToken(vault.quote ?? deployment?.quote);
  const { targets } = useAvailableTargets(deployment);

  useEffect(() => {
    if (selectedPlan === null && vault.plans.length > 0) setSelectedPlan(vault.plans[0]!.id);
  }, [vault.plans, selectedPlan]);

  const plan = useMemo(
    () => vault.plans.find((p) => p.id === selectedPlan),
    [vault.plans, selectedPlan]
  );
  const planTarget = useMemo(
    () => targets.find((t) => t.address === plan?.target),
    [targets, plan]
  );

  // The floor the contract will enforce for each plan, read from the contract
  // rather than recomputed here — the number shown before signing is the number
  // that will be applied.
  const floors = useReadContracts({
    allowFailure: true,
    contracts: activeVault
      ? vault.plans.map((p) => ({
          address: activeVault,
          abi: tideVaultAbi,
          functionName: "requiredOutFor" as const,
          args: [BigInt(p.id)] as const,
          chainId,
        }))
      : [],
    query: { enabled: Boolean(activeVault) && vault.plans.length > 0, staleTime: 8_000 },
  });

  const floorById = useMemo(() => {
    const map = new Map<number, bigint>();
    floors.data?.forEach((entry, i) => {
      if (entry.status === "success") map.set(i, entry.result as bigint);
    });
    return map;
  }, [floors.data]);

  // Reference prices come from the same readiness call the guard uses, keyed by
  // asset — so the price beside a holding is the price that would guard a trade
  // in it, not a separate lookup that could disagree.
  const referencePrices = useMemo(() => {
    const map = new Map<Address, bigint>();
    vault.plans.forEach((p) => {
      const r = vault.readinessById.get(p.id);
      if (r && r.referencePrice > 0n) map.set(p.target, r.referencePrice);
    });
    return map;
  }, [vault.plans, vault.readinessById]);

  const withdrawable: WithdrawableAsset[] = useMemo(() => {
    const list: WithdrawableAsset[] = [];
    if (quoteToken && vault.idleCapital !== undefined) {
      list.push({
        address: quoteToken.address,
        symbol: quoteToken.symbol,
        decimals: quoteToken.decimals,
        balance: vault.idleCapital,
      });
    }
    exposure.holdings.forEach((h) => {
      const t = targets.find((x) => x.address === h.address);
      list.push({
        address: h.address,
        symbol: t?.symbol ?? "TOKEN",
        decimals: t?.decimals ?? 18,
        balance: h.balance,
      });
    });
    return list;
  }, [quoteToken, vault.idleCapital, exposure.holdings, targets]);

  function refreshAll() {
    void vault.refetch();
    void exposure.refetch();
    void executions.refetch();
    void floors.refetch();
  }

  async function togglePlan(planId: number, next: boolean) {
    if (!activeVault) return;
    setBusyPlanId(planId);
    const label = next ? `Resume plan ${planId}` : `Pause plan ${planId}`;
    const id = tracker.track({ label, phase: "awaiting-signature", hash: null, error: null, chainId });
    const result = await tx.send({
      address: activeVault,
      abi: tideVaultAbi as never,
      functionName: "setPlanActive",
      args: [BigInt(planId), next],
      chainId,
      label,
    });
    tracker.update(id, {
      phase: result.ok ? "confirmed" : tx.phase,
      hash: result.hash ?? null,
      error: tx.error,
    });
    setBusyPlanId(null);
    if (result.ok) refreshAll();
  }

  async function createAnotherVault() {
    if (!deployment) return;
    setCreatingVault(true);
    const label = "Create vault";
    const id = tracker.track({ label, phase: "awaiting-signature", hash: null, error: null, chainId });
    const result = await tx.send({
      address: deployment.registry,
      abi: tideRegistryAbi as never,
      functionName: "createVault",
      args: [deployment.quote],
      chainId,
      label,
    });
    tracker.update(id, {
      phase: result.ok ? "confirmed" : tx.phase,
      hash: result.hash ?? null,
      error: tx.error,
    });
    setCreatingVault(false);
    if (result.ok) {
      const { data } = await refetchVaults();
      const list = (data as Address[] | undefined) ?? [];
      // Select the vault that was just deployed, not the one being viewed.
      if (list.length) setActiveVault(list[list.length - 1]);
      setSelectedPlan(null);
    }
  }

  async function toggleVaultPause() {
    if (!activeVault) return;
    const next = !vault.paused;
    const label = next ? "Pause vault" : "Unpause vault";
    const id = tracker.track({ label, phase: "awaiting-signature", hash: null, error: null, chainId });
    const result = await tx.send({
      address: activeVault,
      abi: tideVaultAbi as never,
      functionName: next ? "pause" : "unpause",
      args: [],
      chainId,
      label,
    });
    tracker.update(id, {
      phase: result.ok ? "confirmed" : tx.phase,
      hash: result.hash ?? null,
      error: tx.error,
    });
    if (result.ok) refreshAll();
  }

  /* ── shells before the data exists ─────────────────────────────────────── */

  if (!configured || !deployment) {
    return (
      <>
        <AppHeader vaults={[]} active={undefined} onSelect={() => {}} chainId={chainId} simulated={false} />
        <main id="main" className="shell py-16">
          <SignalRail tone="fail" title="No deployment on this network">
            TIDE has no registry address configured for chain {chainId}. Nothing on this page will
            read or write until one is deployed and its address is provided via{" "}
            <code className="t-mono text-mid">NEXT_PUBLIC_TIDE_REGISTRY</code> or a deployment
            record. Switch to a supported network, or run the deploy script.
          </SignalRail>
          <div className="mt-10">
            <NetworkGuard />
          </div>
        </main>
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <AppHeader
          vaults={[]}
          active={undefined}
          onSelect={() => {}}
          chainId={chainId}
          simulated={deployment.simulated}
        />
        <main id="main" className="shell py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="t-eyebrow">Terminal</p>
              <h1 className="t-display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
                Connect to see your vaults.
              </h1>
              <p className="mt-5 max-w-[50ch] text-[14.5px] leading-[1.65] text-mid">
                TIDE reads everything from the chain. Connecting only lets it find the vaults your
                address owns — it grants no permission to move anything.
              </p>
              <div className="mt-8">
                <ConnectButton size="lg" />
              </div>
            </div>
            <div className="lg:col-span-6 lg:pt-10">
              <CycleDiagram />
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader
        vaults={vaults}
        active={activeVault}
        onSelect={setActiveVault}
        onCreate={() => void createAnotherVault()}
        creating={creatingVault}
        chainId={chainId}
        simulated={deployment.simulated}
      />
      <NetworkGuard />

      <main id="main">
        {vaultsLoading ? (
          <div className="shell space-y-4 py-16">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-80" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : vaults.length === 0 ? (
          <CreateVault deployment={deployment} chainId={chainId} onCreated={() => void refetchVaults()} />
        ) : (
          <>
            <NowNext
              plans={vault.plans}
              readinessById={vault.readinessById}
              quote={quoteToken}
              targets={targets}
              loading={vault.isLoading}
              onAct={(action, planId) => {
                if (action === "deposit") setDrawer("deposit");
                if (action === "plan") setDrawer("plan");
                if (action === "unpause") void toggleVaultPause();
                if (action === "resume" && planId !== undefined) void togglePlan(planId, true);
              }}
            />

            <CapitalRail
              idle={vault.idleCapital}
              plans={vault.plans}
              quote={quoteToken}
              loading={vault.isLoading}
              onDeposit={() => setDrawer("deposit")}
              onWithdraw={() => setDrawer("withdraw")}
            />

            <PlanTable
              plans={vault.plans}
              readinessById={vault.readinessById}
              quote={quoteToken}
              targets={targets}
              selected={selectedPlan}
              onSelect={setSelectedPlan}
              loading={vault.isLoading}
              onCreate={() => setDrawer("plan")}
              onExecute={(id) => {
                setSelectedPlan(id);
                setDrawer("execute");
              }}
              onToggle={(id, next) => void togglePlan(id, next)}
              busyPlanId={busyPlanId}
            />

            {vault.plans.length > 0 ? (
              <Performance
                executions={executions.data?.records ?? []}
                quote={quoteToken}
                target={planTarget}
                simulated={deployment.simulated}
              />
            ) : null}

            <ExposureTable
              holdings={exposure.holdings}
              targets={targets}
              referencePrices={referencePrices}
              chainId={chainId}
              loading={exposure.isLoading}
            />

            <ExecutionLedger
              page={executions.data}
              quote={quoteToken}
              targets={targets}
              chainId={chainId}
              loading={executions.isLoading}
            />

            {activeVault ? (
              <VaultProvenance
                vault={activeVault}
                owner={vault.owner}
                keeper={vault.keeper}
                quoteAddress={vault.quote}
                deployment={deployment}
                protocol={protocol}
                paused={vault.paused}
                chainId={chainId}
                onPauseToggle={() => void toggleVaultPause()}
                pauseBusy={false}
              />
            ) : null}
          </>
        )}
      </main>

      {/* ── drawers ─────────────────────────────────────────────────────── */}
      {activeVault && quoteToken ? (
        <>
          <DepositDrawer
            open={drawer === "deposit"}
            onClose={() => setDrawer(null)}
            vault={activeVault}
            quote={quoteToken}
            chainId={chainId}
            onDone={refreshAll}
          />
          <WithdrawDrawer
            open={drawer === "withdraw"}
            onClose={() => setDrawer(null)}
            vault={activeVault}
            assets={withdrawable}
            chainId={chainId}
            paused={vault.paused}
            onDone={refreshAll}
          />
          <PlanDrawer
            open={drawer === "plan"}
            onClose={() => setDrawer(null)}
            vault={activeVault}
            quote={quoteToken}
            targets={targets}
            chainId={chainId}
            onDone={refreshAll}
          />
          {plan ? (
            <ExecuteDrawer
              open={drawer === "execute"}
              onClose={() => setDrawer(null)}
              vault={activeVault}
              plan={plan}
              quote={quoteToken}
              target={planTarget}
              chainId={chainId}
              readiness={vault.readinessById.get(plan.id)?.reason}
              requiredOut={floorById.get(plan.id)}
              onDone={refreshAll}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
