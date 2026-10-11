import { fmtAmount } from '../format'
import type { Recipe } from '../types'

export function RecipeView({ recipe, people, onClose }: { recipe: Recipe; people: number; onClose: () => void }) {
  return (
    <div className="recipe" role="dialog" aria-label={recipe.name}>
      <h3>{recipe.name}</h3>
      <p className="hint">
        {people}명 기준 · 약 {recipe.minutes}분
      </p>
      <h4>재료</h4>
      <ul>
        {recipe.ingredients.map((i) => (
          <li key={`${i.name}|${i.unit}`}>{`${i.name} ${fmtAmount(i.amount * people)}${i.unit}`}</li>
        ))}
      </ul>
      <h4>순서</h4>
      <ol>
        {recipe.steps.map((s, idx) => (
          <li key={idx}>{s}</li>
        ))}
      </ol>
      <button onClick={onClose}>닫기</button>
    </div>
  )
}
