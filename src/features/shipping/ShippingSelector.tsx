import {
  OTRO,
  cantones,
  provincias,
  zonas,
  type Seleccion,
  type Tarifa,
} from '../../lib/shipping-sheet'

const selectCls = 'w-full border border-stone-300 rounded px-2 py-1 bg-white'

type Props = {
  tarifas: Tarifa[]
  /** true cuando no hay tarifas disponibles: solo se pide el destino para consultarlo */
  soloConsulta: boolean
  valor: Seleccion
  onChange: (s: Seleccion) => void
  destinoTexto: string
  onDestinoTexto: (texto: string) => void
}

export default function ShippingSelector({
  tarifas,
  soloConsulta,
  valor,
  onChange,
  destinoTexto,
  onDestinoTexto,
}: Props) {
  const esOtro = soloConsulta || valor.provincia === OTRO
  const listaCantones = valor.provincia && !esOtro ? cantones(tarifas, valor.provincia) : []
  const listaZonas =
    valor.provincia && valor.canton && !esOtro ? zonas(tarifas, valor.provincia, valor.canton) : []

  return (
    <div className="space-y-3">
      {!soloConsulta && (
        <>
          <div className="space-y-1">
            <label htmlFor="provincia" className="text-sm text-stone-600">Provincia</label>
            <select
              id="provincia"
              className={selectCls}
              value={valor.provincia}
              onChange={(e) => onChange({ provincia: e.target.value, canton: '', zona: '' })}
            >
              <option value="">Elegir…</option>
              {provincias(tarifas).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value={OTRO}>Mi destino no está en la lista</option>
            </select>
          </div>

          {!esOtro && valor.provincia && (
            <div className="space-y-1">
              <label htmlFor="canton" className="text-sm text-stone-600">Cantón</label>
              <select
                id="canton"
                className={selectCls}
                value={valor.canton}
                onChange={(e) => onChange({ ...valor, canton: e.target.value, zona: '' })}
              >
                <option value="">Elegir…</option>
                {listaCantones.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {!esOtro && valor.canton && listaZonas.length > 1 && (
            <div className="space-y-1">
              <label htmlFor="zona" className="text-sm text-stone-600">Zona</label>
              <select
                id="zona"
                className={selectCls}
                value={valor.zona}
                onChange={(e) => onChange({ ...valor, zona: e.target.value })}
              >
                <option value="">Elegir…</option>
                {listaZonas.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {esOtro && (
        <div className="space-y-1">
          <label htmlFor="destino" className="text-sm text-stone-600">
            Ciudad y provincia de entrega
          </label>
          <input
            id="destino"
            className={selectCls}
            value={destinoTexto}
            onChange={(e) => onDestinoTexto(e.target.value)}
            placeholder="Ej.: Zamora, Zamora Chinchipe"
          />
          <p className="text-xs text-stone-500">El costo de envío se confirmará por WhatsApp.</p>
        </div>
      )}
    </div>
  )
}
