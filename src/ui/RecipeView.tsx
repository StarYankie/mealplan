import { fmtAmount } from '../format'
import type { Recipe } from '../types'

export function RecipeView({ recipe, people }: { recipe: Recipe; people: number }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{recipe.name}</h2>
      <p className="mt-1 text-sm text-mute">
        {people}명 기준 · 약 {recipe.minutes}분
      </p>
      <h3 className="mb-1 mt-5 text-xs font-semibold text-mute">재료</h3>
      <ul>
        {recipe.ingredients.map((i) => (
          <li key={`${i.name}|${i.unit}`} className="border-b border-line py-2 text-[15px] last:border-b-0">
            {`${i.name} ${fmtAmount(i.amount * people)}${i.unit}`}
          </li>
        ))}
      </ul>
      <h3 className="mb-1 mt-5 text-xs font-semibold text-mute">순서</h3>
      <ol className="space-y-3">
        {recipe.steps.map((s, idx) => (
          <li key={idx} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-toss-soft text-xs font-bold text-toss">
              {idx + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
