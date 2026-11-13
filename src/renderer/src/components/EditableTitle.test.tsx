import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditableTitle } from './EditableTitle'

describe('EditableTitle', () => {
  it('renders the value and commits a new one on Enter', () => {
    const onCommit = vi.fn()
    render(<EditableTitle value="new-room" onCommit={onCommit} />)

    fireEvent.click(screen.getByRole('button', { name: 'new-room' }))
    const input = screen.getByLabelText('Rename') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'roadmap' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onCommit).toHaveBeenCalledWith('roadmap')
  })

  it('cancels on Escape without committing', () => {
    const onCommit = vi.fn()
    render(<EditableTitle value="new-room" onCommit={onCommit} />)

    fireEvent.click(screen.getByRole('button', { name: 'new-room' }))
    const input = screen.getByLabelText('Rename')
    fireEvent.change(input, { target: { value: 'discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'new-room' })).toBeInTheDocument()
  })

  it('ignores a blank commit', () => {
    const onCommit = vi.fn()
    render(<EditableTitle value="new-room" onCommit={onCommit} />)

    fireEvent.click(screen.getByRole('button', { name: 'new-room' }))
    const input = screen.getByLabelText('Rename')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('does not commit when the value is unchanged', () => {
    const onCommit = vi.fn()
    render(<EditableTitle value="new-room" onCommit={onCommit} />)

    fireEvent.click(screen.getByRole('button', { name: 'new-room' }))
    fireEvent.keyDown(screen.getByLabelText('Rename'), { key: 'Enter' })

    expect(onCommit).not.toHaveBeenCalled()
  })
})
