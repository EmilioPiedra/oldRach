import { useEffect, useState, type FormEvent } from 'react'
import { requireSupabase } from '../../lib/supabase'
import { mensajeError } from '../../lib/errors'

type Item = { id: string; name: string; published: boolean }

/** Pantalla reutilizable para administrar Marcas y Categorías. */
export default function SimpleCatalog({
  table,
  titulo,
}: {
  table: 'brands' | 'categories'
  titulo: string
}) {
  const [items, setItems] = useState<Item[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function cargar() {
    const { data, error } = await requireSupabase()
      .from(table)
      .select('id,name,published')
      .order('name')
    if (error) setError(mensajeError(error))
    else setItems((data ?? []) as Item[])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  async function agregar(e: FormEvent) {
    e.preventDefault()
    const name = nuevo.trim()
    if (!name) return
    setError(null)
    const { error } = await requireSupabase().from(table).insert({ name })
    if (error) return setError(mensajeError(error))
    setNuevo('')
    cargar()
  }

  async function guardarNombre(item: Item) {
    const name = editName.trim()
    if (!name) return
    setError(null)
    const { error } = await requireSupabase().from(table).update({ name }).eq('id', item.id)
    if (error) return setError(mensajeError(error))
    setEditId(null)
    cargar()
  }

  async function cambiarPublicado(item: Item) {
    setError(null)
    const { error } = await requireSupabase()
      .from(table)
      .update({ published: !item.published })
      .eq('id', item.id)
    if (error) return setError(mensajeError(error))
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, published: !i.published } : i)))
  }

  async function eliminar(item: Item) {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return
    setError(null)
    const { error } = await requireSupabase().from(table).delete().eq('id', item.id)
    if (error) return setError(mensajeError(error))
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{titulo}</h1>

      <form onSubmit={agregar} className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nombre nuevo"
          className="border border-stone-300 rounded px-2 py-1 bg-white flex-1 max-w-xs"
        />
        <button type="submit" className="bg-stone-900 text-white rounded px-4 py-1">
          Agregar
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="text-stone-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-stone-500">Todavía no hay registros. Agrega el primero arriba.</p>
      ) : (
        <ul className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 p-2">
              {editId === item.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border border-stone-300 rounded px-2 py-1 flex-1 max-w-xs"
                    autoFocus
                  />
                  <button onClick={() => guardarNombre(item)} className="border rounded px-2 py-1">
                    Guardar
                  </button>
                  <button onClick={() => setEditId(null)} className="border rounded px-2 py-1">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 ${item.published ? '' : 'text-stone-400 line-through'}`}>
                    {item.name}
                  </span>
                  <label className="text-sm flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={item.published}
                      onChange={() => cambiarPublicado(item)}
                    />
                    Publicada
                  </label>
                  <button
                    onClick={() => {
                      setEditId(item.id)
                      setEditName(item.name)
                    }}
                    className="border rounded px-2 py-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminar(item)}
                    className="border border-red-300 text-red-700 rounded px-2 py-1"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
