import { render, screen } from '@testing-library/react'
import EmptyState from '../EmptyState'
import { describe, it, expect, vi } from 'vitest'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Nothing to see here" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const onClick = vi.fn()
    render(<EmptyState title="Empty" description="desc" action={{ label: 'Add', onClick }} />)
    const btn = screen.getByText('Add')
    btn.click()
    expect(onClick).toHaveBeenCalled()
  })
})
