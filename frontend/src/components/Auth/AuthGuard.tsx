import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/client'

export default function AuthGuard() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    authApi.me().then(() => setReady(true)).catch(() => navigate('/login'))
  }, [])

  if (!ready) return null
  return <Outlet />
}
