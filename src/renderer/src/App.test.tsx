import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the product name', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Symfoly' })).toBeInTheDocument()
  })

  it('broadcasts a message to the log', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hello agents' } })
    fireEvent.click(screen.getByRole('button', { name: 'Broadcast' }))
    expect(screen.getByText(/hello agents/)).toBeInTheDocument()
  })
})
