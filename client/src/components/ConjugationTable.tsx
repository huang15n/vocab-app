import type { PersonForms } from '../types'

const PERSON_ORDER = [
  'je',
  'tu',
  'il/elle/on',
  'nous',
  'vous',
  'ils/elles',
  'que_je',
  'que_tu',
  'qu_il/elle/on',
  'que_nous',
  'que_vous',
  'qu_ils/elles',
]

const LABELS: Record<string, string> = {
  je: 'je',
  tu: 'tu',
  'il/elle/on': 'il / elle / on',
  nous: 'nous',
  vous: 'vous',
  'ils/elles': 'ils / elles',
  que_je: 'que je',
  que_tu: 'que tu',
  'qu_il/elle/on': "qu'il / elle / on",
  que_nous: 'que nous',
  que_vous: 'que vous',
  'qu_ils/elles': "qu'ils / elles",
}

interface Props {
  forms: PersonForms
}

export default function ConjugationTable({ forms }: Props) {
  const entries = PERSON_ORDER.filter((p) => forms[p as keyof PersonForms]).map((p) => ({
    person: p,
    form: forms[p as keyof PersonForms] as string,
  }))

  // fallback if custom keys
  if (entries.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(forms).map(([p, f]) => (
          <div key={p} className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-500">{LABELS[p] || p}</span>
            <span className="font-medium text-slate-900">{f}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {entries.map(({ person, form }) => (
            <tr key={person} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 pr-4 text-slate-500 w-36">{LABELS[person] || person}</td>
              <td className="py-2.5 font-medium text-slate-900">{form}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
