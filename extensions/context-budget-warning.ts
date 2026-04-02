import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const WARNING_LEVELS = [
	{
		threshold: 100_000,
		title: "Context awareness",
		color: "accent",
		notificationLevel: "info",
		advice: "Keep an eye on context growth.",
	},
	{
		threshold: 150_000,
		title: "Context warning",
		color: "warning",
		notificationLevel: "warning",
		advice: "Compact soon to avoid running into context pressure.",
	},
	{
		threshold: 200_000,
		title: "Critical context usage",
		color: "error",
		notificationLevel: "error",
		advice: "Compact now or start a fresh session.",
	},
] as const;
const WARNING_THRESHOLDS = WARNING_LEVELS.map((level) => level.threshold);
const WIDGET_ID = "context-budget-warning";

function formatTokens(tokens: number): string {
	if (tokens >= 1_000_000) {
		return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
	}
	if (tokens >= 1_000) {
		return `${(tokens / 1_000).toFixed(tokens % 1_000 === 0 ? 0 : 1)}k`;
	}
	return `${tokens}`;
}

function formatPercent(tokens: number, contextWindow?: number): string | undefined {
	if (!contextWindow || contextWindow <= 0) {
		return undefined;
	}
	return `${Math.round((tokens / contextWindow) * 100)}%`;
}

function getWarningLevel(tokens: number) {
	return [...WARNING_LEVELS].reverse().find((level) => tokens >= level.threshold);
}

function getContextWindow(ctx: ExtensionContext): number | undefined {
	return typeof ctx.model?.contextWindow === "number" ? ctx.model.contextWindow : undefined;
}

function updateUi(ctx: ExtensionContext): number | null {
	const usage = ctx.getContextUsage();
	if (!usage) {
		if (ctx.hasUI) {
			ctx.ui.setWidget(WIDGET_ID, undefined);
		}
		return null;
	}

	const tokens = typeof usage.tokens === "number" ? usage.tokens : null;
	if (tokens === null) {
		if (ctx.hasUI) {
			ctx.ui.setWidget(WIDGET_ID, undefined);
		}
		return null;
	}
	if (!ctx.hasUI) {
		return tokens;
	}
	if (tokens < WARNING_THRESHOLDS[0]) {
		ctx.ui.setWidget(WIDGET_ID, undefined);
		return tokens;
	}

	const contextWindow = getContextWindow(ctx);
	const percent = formatPercent(tokens, contextWindow);
	const theme = ctx.ui.theme;
	const currentLevel = getWarningLevel(tokens)!;
	ctx.ui.setWidget(
		WIDGET_ID,
		[
			theme.fg(
				currentLevel.color,
				`${currentLevel.title}: ${formatTokens(currentLevel.threshold)} reached${percent ? ` (${percent})` : ""}`,
			),
		],
		{ placement: "belowEditor" },
	);
	return tokens;
}

function buildWarningMessage(
	crossedThresholds: readonly number[],
	currentTokens: number,
	ctx: ExtensionContext,
): { message: string; level: "info" | "warning" | "error" } {
	const latestThreshold = crossedThresholds[crossedThresholds.length - 1];
	const warningLevel = WARNING_LEVELS.find((level) => level.threshold === latestThreshold)!;
	const contextWindow = getContextWindow(ctx);
	const percent = formatPercent(currentTokens, contextWindow);
	const thresholdSummary =
		crossedThresholds.length === 1
			? `${warningLevel.title}: reached ${formatTokens(latestThreshold)} tokens`
			: `${warningLevel.title}: crossed ${crossedThresholds.map(formatTokens).join(", ")} tokens`;
	const windowSummary = percent && contextWindow ? ` (${percent} of ${formatTokens(contextWindow)})` : "";
	return {
		message: `${thresholdSummary}${windowSummary}. ${warningLevel.advice}`,
		level: warningLevel.notificationLevel,
	};
}

export default function contextBudgetWarningExtension(pi: ExtensionAPI) {
	let previousTokens: number | null | undefined;

	const refresh = (ctx: ExtensionContext, notifyOnThresholdCrossing: boolean) => {
		const currentTokens = updateUi(ctx);
		if (currentTokens === null) {
			previousTokens = null;
			return;
		}

		if (notifyOnThresholdCrossing && previousTokens !== undefined && previousTokens !== null) {
			const crossedThresholds = WARNING_THRESHOLDS.filter(
				(threshold) => previousTokens! < threshold && currentTokens >= threshold,
			);
			if (crossedThresholds.length > 0 && ctx.hasUI) {
				const warning = buildWarningMessage(crossedThresholds, currentTokens, ctx);
				ctx.ui.notify(warning.message, warning.level);
			}
		}

		previousTokens = currentTokens;
	};

	pi.on("session_start", async (_event, ctx) => {
		previousTokens = undefined;
		refresh(ctx, false);
	});

	pi.on("session_switch", async (_event, ctx) => {
		previousTokens = undefined;
		refresh(ctx, false);
	});

	pi.on("session_compact", async (_event, ctx) => {
		refresh(ctx, false);
	});

	pi.on("model_select", async (_event, ctx) => {
		refresh(ctx, false);
	});

	pi.on("turn_end", async (_event, ctx) => {
		refresh(ctx, true);
	});
}
