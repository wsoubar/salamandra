import { useEffect, useMemo, useState } from 'react'

type Message = { id: number; key: string; value: string; time: string; partition: number; offset: number }
type Topic = { name: string; partitions: number; messages: Message[] }

const initialTopics: Topic[] = [
  { name: 'pedidos', partitions: 3, messages: [
    { id: 1, key: 'pedido-1042', value: '{ "status": "criado", "total": 89.90 }', time: '14:32:08', partition: 0, offset: 0 },
    { id: 2, key: 'pedido-1043', value: '{ "status": "pago", "total": 42.00 }', time: '14:32:12', partition: 1, offset: 0 },
    { id: 3, key: 'pedido-1044', value: '{ "status": "enviado", "total": 156.50 }', time: '14:32:19', partition: 0, offset: 1 },
  ] },
  { name: 'usuarios', partitions: 2, messages: [
    { id: 4, key: 'user-208', value: '{ "evento": "cadastro", "cidade": "Recife" }', time: '14:31:45', partition: 1, offset: 0 },
  ] },
  { name: 'notificacoes', partitions: 1, messages: [] },
]

const consumers = [
  { name: 'email-service', group: 'notificacoes-v1', color: 'violet', topics: ['pedidos', 'usuarios'] },
  { name: 'analytics-worker', group: 'analytics', color: 'blue', topics: ['pedidos'] },
]

const topicTemplates: Record<string, { key: string; value: string }> = {
  pedidos: {
    key: 'pedido-1045',
    value: JSON.stringify({ evento: 'pedido-criado', pedidoId: 'pedido-1045', clienteId: 'cliente-208', total: 53.3 }, null, 2),
  },
  usuarios: {
    key: 'user-309',
    value: JSON.stringify({ evento: 'usuario-cadastrado', usuarioId: 'user-309', nome: 'Marina Costa', email: 'marina@example.com', cidade: 'Recife' }, null, 2),
  },
  notificacoes: {
    key: 'pedido-1045',
    value: JSON.stringify({ evento: 'entrega-atualizada', pedidoId: 'pedido-1045', status: 'saiu-para-entrega', previsao: '2026-11-10T18:00:00Z' }, null, 2),
  },
}

function templateForTopic(name: string) {
  return topicTemplates[name] ?? {
    key: `${name}-exemplo`,
    value: JSON.stringify({ evento: 'exemplo', topico: name, mensagem: 'Olá, Kafka!' }, null, 2),
  }
}

const STORAGE_KEY = 'salamandra-kafka-playground-v1'

function loadTopics(): Topic[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return initialTopics
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed) || !parsed.every((item) =>
      typeof item?.name === 'string' && Number.isInteger(item?.partitions) &&
      item.partitions > 0 && Array.isArray(item?.messages))) return initialTopics
    return parsed as Topic[]
  } catch {
    return initialTopics
  }
}

function App() {
  const [topics, setTopics] = useState<Topic[]>(loadTopics)
  const [selected, setSelected] = useState('pedidos')
  const [key, setKey] = useState(() => templateForTopic('pedidos').key)
  const [value, setValue] = useState(() => templateForTopic('pedidos').value)
  const [notice, setNotice] = useState('')
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [topicName, setTopicName] = useState('')
  const [paused, setPaused] = useState(false)
  const topic = topics.find((item) => item.name === selected) ?? topics[0]
  const totalMessages = useMemo(() => topics.reduce((sum, item) => sum + item.messages.length, 0), [topics])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(topics))
    } catch {
      setNotice('Não foi possível salvar neste navegador. O armazenamento pode estar cheio ou desativado.')
    }
  }, [topics])

  function resetPlayground() {
    setTopics(initialTopics)
    setSelected('pedidos')
    setKey(templateForTopic('pedidos').key)
    setValue(templateForTopic('pedidos').value)
    setNotice('Dados de exemplo restaurados.')
    window.setTimeout(() => setNotice(''), 3600)
  }

  function selectTopic(name: string) {
    setSelected(name)
    const template = templateForTopic(name)
    setKey(template.key)
    setValue(template.value)
    setNotice(`Modelo de mensagem carregado para o tópico ${name}.`)
    window.setTimeout(() => setNotice(''), 3600)
  }

  function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      JSON.parse(value)
      const partition = key ? [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % topic.partitions : Math.floor(Math.random() * topic.partitions)
      const offset = topic.messages.filter((message) => message.partition === partition).length
      const now = new Date().toLocaleTimeString('pt-BR', { hour12: false })
      const message: Message = { id: Date.now(), key: key || '—', value: JSON.stringify(JSON.parse(value)), time: now, partition, offset }
      setTopics((current) => current.map((item) => item.name === selected ? { ...item, messages: [message, ...item.messages] } : item))
      setNotice(`Mensagem enviada para ${selected} · partição ${partition} · offset ${offset}`)
      window.setTimeout(() => setNotice(''), 3600)
    } catch {
      setNotice('O valor precisa ser um JSON válido.')
    }
  }

  function createTopic(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = topicName.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-')
    if (!clean || topics.some((item) => item.name === clean)) return
    setTopics((current) => [...current, { name: clean, partitions: 3, messages: [] }])
    setSelected(clean)
    setTopicName('')
    setShowTopicForm(false)
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="#inicio"><span className="brand-mark">S</span><span>Salamandra<small>Kafka playground</small></span></a>
        <div className="side-label">WORKSPACE</div>
        <button className="nav-item active"><span>▦</span> Visão geral</button>
        <div className="side-label topic-label">TÓPICOS <button aria-label="Criar tópico" onClick={() => setShowTopicForm((open) => !open)}>＋</button></div>
        {showTopicForm && <form className="topic-create" onSubmit={createTopic}><input autoFocus aria-label="Nome do tópico" placeholder="nome-do-topico" value={topicName} onChange={(event) => setTopicName(event.target.value)} /><button aria-label="Salvar tópico">↵</button></form>}
        <div className="topic-list">{topics.map((item) => <button key={item.name} className={`topic-nav ${selected === item.name ? 'selected' : ''}`} onClick={() => selectTopic(item.name)}><span className="topic-dot" />{item.name}<span className="topic-count">{item.messages.length}</span></button>)}</div>
        <div className="side-bottom"><span className="online-dot" /> Broker simulado <span className="local-tag">LOCAL</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">Playground <span>/</span> <b>Visão geral</b></div><div className="top-right"><button className="reset-button" onClick={resetPlayground}>Restaurar exemplos</button><span className="simulation"><i /> simulação local</span><button className="avatar" title="Perfil">S</button></div></header>
        <div className="content-wrap">
          <section className="welcome"><div><div className="eyebrow">AMBIENTE DE ESTUDO <span>·</span> 01</div><h1>Kafka, na prática.</h1><p>Explore tópicos, publique mensagens e acompanhe o fluxo entre produtores e consumidores.</p></div><div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span>✳</span><i className="spark spark-a"/><i className="spark spark-b"/></div></section>

          <section className="metrics" aria-label="Resumo do workspace"><article className="metric-card"><div className="metric-icon orange">▤</div><span className="metric-label">TÓPICOS</span><strong>{topics.length.toString().padStart(2, '0')}</strong><small>no workspace</small></article><article className="metric-card"><div className="metric-icon blue">▧</div><span className="metric-label">MENSAGENS</span><strong>{totalMessages.toString().padStart(2, '0')}</strong><small>mensagens publicadas</small></article><article className="metric-card"><div className="metric-icon violet">⌘</div><span className="metric-label">CONSUMIDORES</span><strong>02</strong><small>em 2 consumer groups</small></article><article className="metric-card broker-card"><div className="metric-icon green">⌁</div><span className="metric-label">BROKER</span><strong className="broker-state"><i /> Online</strong><small>simulador no navegador</small></article></section>

          <div className="section-heading"><div><h2>Fluxo de mensagens</h2><p>Publique uma mensagem e veja como ela percorre o sistema.</p></div><span className="live-pill"><i /> AO VIVO</span></div>
          <section className="flow-panel">
            <div className="flow-node producer"><div className="node-top"><span className="node-icon producer-icon">↗</span><span className="node-type">PRODUTOR</span><span className="node-live">● ativo</span></div><h3>Seu produtor</h3><p>Envie eventos para um tópico Kafka.</p><div className="node-foot">JavaScript <span>→</span> Kafka</div></div>
            <div className="flow-connector"><span className="connector-line"/><span className="connector-dot">›</span><small>publica</small></div>
            <div className="flow-node topic-node"><div className="node-top"><span className="node-icon topic-icon">▤</span><span className="node-type">TÓPICO</span><span className="partition-count">{topic.partitions} partições</span></div><h3>{topic.name}</h3><p>{topic.messages.length} mensagens · distribuídas por chave</p><div className="partition-bars">{Array.from({ length: topic.partitions }, (_, index) => <span key={index} className={topic.messages.some((message) => message.partition === index) ? 'filled' : ''}><i />{index}</span>)}</div></div>
            <div className="flow-connector"><span className="connector-line"/><span className="connector-dot">›</span><small>consome</small></div>
            <div className="consumer-stack">{consumers.map((consumer) => <div className="consumer-node" key={consumer.name}><span className={`consumer-icon ${consumer.color}`}>⇥</span><div><h3>{consumer.name}</h3><p>{consumer.group}</p></div><span className="consumer-active">●</span></div>)}</div>
          </section>

          <div className="lower-grid"><section className="publish-panel"><div className="panel-heading"><div><span className="panel-kicker">PRODUCER</span><h2>Publicar mensagem</h2></div><span className="code-tag">JSON</span></div><form onSubmit={publish}><label htmlFor="topic-select">TÓPICO</label><select id="topic-select" value={selected} onChange={(event) => selectTopic(event.target.value)}>{topics.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select><label htmlFor="message-key">CHAVE <span>opcional · mesma chave vai para a mesma partição</span></label><input id="message-key" placeholder="ex: pedido-1045" value={key} onChange={(event) => setKey(event.target.value)} /><label htmlFor="message-value">VALOR <span>JSON</span></label><textarea id="message-value" spellCheck={false} value={value} onChange={(event) => setValue(event.target.value)} /><button className="publish-button" type="submit"><span>↗</span> Publicar mensagem</button>{notice && <p className="notice" role="status">{notice}</p>}</form><div className="learning-note"><span>✳</span><p><b>Sabia disso?</b> Mensagens com a mesma chave são sempre direcionadas à mesma partição, mantendo a ordem.</p></div></section>

          <section className="messages-panel"><div className="panel-heading messages-heading"><div><span className="panel-kicker">STREAM</span><h2>Mensagens recentes <span className="message-total">{topic.messages.length}</span></h2></div><button className={`pause-button ${paused ? 'is-paused' : ''}`} onClick={() => setPaused((state) => !state)}>{paused ? '▶ Retomar' : 'Ⅱ Pausar'}</button></div><div className="message-list">{paused ? <div className="empty-state"><span>Ⅱ</span><b>Stream pausado</b><small>Retome para acompanhar novas mensagens.</small></div> : topic.messages.length === 0 ? <div className="empty-state"><span>⌁</span><b>Nenhuma mensagem ainda</b><small>Publique uma mensagem para vê-la aqui.</small></div> : topic.messages.map((message) => <article className="message-item" key={message.id}><div className="message-marker">↙</div><div className="message-body"><div className="message-meta"><code>{message.key}</code><time>{message.time}</time></div><pre>{message.value}</pre><div className="message-coords"><span>partição <b>{message.partition}</b></span><span>offset <b>{message.offset}</b></span></div></div></article>)}</div><button className="view-all" onClick={() => setNotice('Você está vendo todas as mensagens recentes deste tópico.')}>Ver todas as mensagens <span>→</span></button></section></div>
          <footer>Feito para aprender, sem precisar de um broker. <span>Kafka playground <b>✳</b></span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
