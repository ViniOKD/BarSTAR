import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState('Verificando conexão...')

  useEffect(() => {
    let active = true

    async function checkConnection() {
      try {
        const response = await fetch('/api/health/')

        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}`)
        }

        const data = await response.json()

        if (active) {
          setMessage(data.message)
        }
      } catch {
        if (active) {
          setMessage('Não foi possível conectar à API.')
        }
      }
    }

    checkConnection()

    return () => {
      active = false
    }
  }, [])

  return (
    <main>
      <h1>BARStar</h1>
      <p>{message}</p>
    </main>
  )
}

export default App