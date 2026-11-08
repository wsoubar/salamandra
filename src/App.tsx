import { useEffect, useMemo, useState } from 'react'

type ShoppingItem = { id: string; name: string; quantity: number; price: number | null; checked: boolean }
type Filter = 'all' | 'open' | 'done'

const STORAGE_KEY = 'salamandra-shopping-list-v1'
const starterItems: ShoppingItem[] = [
  { id: 'starter-1', name: 'Leite', quantity: 2, price: 5.49, checked: false },
  { id: 'starter-2', name: 'Pão integral', quantity: 1, price: 8.9, checked: false },
  { id: 'starter-3', name: 'Banana', quantity: 6, price: null, checked: true },
]

function loadItems(): ShoppingItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return starterItems
    const data: unknown = JSON.parse(saved)
    if (!Array.isArray(data) || !data.every((item) => typeof item?.id === 'string' && typeof item?.name === 'string' && typeof item?.checked === 'boolean')) return starterItems
    return data as ShoppingItem[]
  } catch {
    return starterItems
  }
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function App() {
  const [items, setItems] = useState<ShoppingItem[]>(loadItems)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [message, setMessage] = useState('')

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { setMessage('Não foi possível salvar os dados neste aparelho.') }
  }, [items])

  const openCount = items.filter((item) => !item.checked).length
  const doneCount = items.length - openCount
  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0)
  const estimatedCount = items.filter((item) => item.price !== null).length
  const visibleItems = useMemo(() => items.filter((item) => filter === 'all' || (filter === 'open' ? !item.checked : item.checked)), [filter, items])

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    const numericPrice = price.trim() ? Number(price.replace(',', '.')) : null
    if (numericPrice !== null && (!Number.isFinite(numericPrice) || numericPrice < 0)) {
      setMessage('Confira o preço: use um valor como 12,50.')
      return
    }
    setItems((current) => [{ id: crypto.randomUUID(), name: cleanName, quantity: Math.max(1, Number(quantity) || 1), price: numericPrice, checked: false }, ...current])
    setName('')
    setQuantity('1')
    setPrice('')
    setMessage('Item adicionado à lista.')
    window.setTimeout(() => setMessage(''), 2500)
  }

  function toggleItem(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, checked: !item.checked } : item))
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  function clearDone() {
    setItems((current) => current.filter((item) => !item.checked))
  }

  return (
    <main className="shopping-app">
      <header className="app-header">
        <a className="app-brand" href="#inicio" aria-label="Salamandra, início"><span className="brand-mark">S</span><span>Salamandra<small>lista de compras</small></span></a>
        <span className="saved-indicator"><i /> salvo neste aparelho</span>
      </header>

      <div className="shopping-content">
        <section className="shopping-intro"><span className="intro-kicker">SUA PRÓXIMA IDA AO MERCADO</span><h1>Lista de compras</h1><p>Organize os itens e acompanhe o total enquanto compra.</p></section>

        <section className="summary-card" aria-label="Resumo da lista">
          <div className="summary-top"><span>ESTIMATIVA DA COMPRA</span><span className="basket-icon" aria-hidden="true">▤</span></div>
          <strong>{money(total)}</strong>
          <div className="summary-bottom"><span>{estimatedCount} de {items.length} itens com preço</span><span className="summary-separator" /><span>{openCount} {openCount === 1 ? 'pendente' : 'pendentes'}</span></div>
          <div className="progress-track"><span style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} /></div>
        </section>

        <section className="add-card">
          <div className="section-title"><span className="title-icon">＋</span><div><h2>Adicionar item</h2><p>Preço é opcional</p></div></div>
          <form className="add-form" onSubmit={addItem}>
            <label className="field-label" htmlFor="item-name">O QUE VOCÊ PRECISA?</label>
            <input id="item-name" className="name-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: arroz, café, detergente" autoComplete="off" required />
            <div className="optional-fields">
              <label className="compact-field"><span>QUANTIDADE</span><input type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantidade" /></label>
              <label className="compact-field"><span>PREÇO UNITÁRIO <i>opcional</i></span><div className="price-input"><span>R$</span><input type="text" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0,00" aria-label="Preço unitário, opcional" /></div></label>
            </div>
            <button className="add-button" type="submit"><span>＋</span> Adicionar à lista</button>
            {message && <p className="form-message" role="status">{message}</p>}
          </form>
        </section>

        <section className="list-section">
          <div className="list-heading"><div><h2>Sua lista <span>{items.length}</span></h2><p>Toque no círculo quando colocar no carrinho.</p></div>{doneCount > 0 && <button className="clear-button" onClick={clearDone}>Limpar concluídos</button>}</div>
          <div className="filter-tabs" role="group" aria-label="Filtrar itens">
            {(['all', 'open', 'done'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? `Todos · ${items.length}` : value === 'open' ? `Pendentes · ${openCount}` : `No carrinho · ${doneCount}`}</button>)}
          </div>
          <div className="item-list">
            {visibleItems.length === 0 ? <div className="empty-list"><span>✓</span><b>{items.length === 0 ? 'Sua lista está vazia' : 'Nada por aqui'}</b><small>{items.length === 0 ? 'Adicione seu primeiro item acima.' : 'Escolha outro filtro para ver itens.'}</small></div> : visibleItems.map((item) => <article className={`shopping-item ${item.checked ? 'checked' : ''}`} key={item.id}>
              <button className="check-button" onClick={() => toggleItem(item.id)} aria-label={item.checked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`} aria-pressed={item.checked}>{item.checked && <span>✓</span>}</button>
              <div className="item-copy"><b>{item.name}</b><small>{item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}{item.price !== null ? ` · ${money(item.price)} cada` : ''}</small></div>
              <div className="item-total">{item.price !== null ? money(item.price * item.quantity) : <span>sem preço</span>}</div>
              <button className="remove-button" onClick={() => removeItem(item.id)} aria-label={`Remover ${item.name}`}>×</button>
            </article>)}
          </div>
          <p className="total-note">Total estimado considera somente itens com preço informado.</p>
        </section>

        <footer className="app-footer"><span>Seus dados ficam salvos neste navegador.</span><button onClick={() => { if (window.confirm('Restaurar a lista de exemplo? Seus itens atuais serão substituídos.')) setItems(starterItems) }}>Restaurar exemplo</button></footer>
      </div>
    </main>
  )
}

export default App
