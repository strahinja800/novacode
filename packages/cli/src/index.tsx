import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { RootLayout } from './layout/root-layout'
import { Home } from './screens/home'
import { NewSession } from './screens/new-session'
import { Session } from './screens/session'

const router = createMemoryRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <box>
            <Home />
          </box>
        ),
      },
      {
        path: 'sessions/new',
        element: (
          <box>
            <NewSession />
          </box>
        ),
      },
      {
        path: 'sessions/:id',
        element: (
          <box>
            <text>
              <Session />
            </text>
          </box>
        ),
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
})
createRoot(renderer).render(<App />)
