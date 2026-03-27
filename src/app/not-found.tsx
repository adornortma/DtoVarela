import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>404 - Página no encontrada</h2>
      <p>Lo sentimos, no pudimos encontrar la página que buscas.</p>
      <Link 
        href="/" 
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#019df4', 
          color: 'white', 
          borderRadius: '8px',
          textDecoration: 'none'
        }}
      >
        Volver al Inicio
      </Link>
    </div>
  )
}
