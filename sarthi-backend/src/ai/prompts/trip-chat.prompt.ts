import { buildPersonalityBlock } from './destination.prompt';
import type { TravelerProfileSnapshot } from './destination.prompt';

export interface TripChatContext {
  destination: string;
  state: string;
  dates?: { from: string; to: string };
  itinerarySummary?: string;
  foodSummary?: string;
  profile?: TravelerProfileSnapshot | null;
  recentMessages?: Array<{ role: string; content: string }>;
}

export function buildTripChatSystem(ctx: TripChatContext): string {
  const personalityBlock = buildPersonalityBlock(ctx.profile ?? null);

  const tripInfo = [
    `Destination: ${ctx.destination}, ${ctx.state}`,
    ctx.dates ? `Dates: ${ctx.dates.from} to ${ctx.dates.to}` : '',
  ].filter(Boolean).join('\n');

  const itinerarySection = ctx.itinerarySummary
    ? `\n\nItinerary summary:\n${ctx.itinerarySummary}`
    : '';

  const foodSection = ctx.foodSummary
    ? `\n\nFood guide highlights:\n${ctx.foodSummary}`
    : '';

  const historySection = ctx.recentMessages?.length
    ? `\n\nRecent conversation:\n${ctx.recentMessages.map(m => `${m.role === 'user' ? 'Traveler' : 'Assistant'}: ${m.content}`).join('\n')}`
    : '';

  return `You are a knowledgeable travel assistant for a trip to ${ctx.destination}, ${ctx.state}. Answer questions concisely and practically. Focus on what's useful on the ground — local tips, safety, logistics, culture.

## Trip Context
${tripInfo}${itinerarySection}${foodSection}${personalityBlock}${historySection}

Keep answers short (2-4 sentences) unless the question needs a longer response. Always be practical and specific to ${ctx.destination}.`;
}
