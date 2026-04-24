const GRADIENTS: string[][] = [
  ['#1B4332', '#2D6A4F', '#52B788'], // forest
  ['#1A3A5C', '#2E5F8A', '#5B8DB8'], // ocean
  ['#3B2314', '#6B3F22', '#A0622F'], // desert
  ['#2C3E50', '#3D5166', '#5D7A8A'], // mountain
  ['#4A1942', '#7B2D7B', '#B05BB0'], // sunset
  ['#0D3B2E', '#1A6B52', '#2D9E7A'], // jungle
];

export function destinationGradient(name: string): string[] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
