import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '16px',
    margin: '8px 0',
    background: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'grab',
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      Item {id}
    </div>
  )
}

export default function TesteDrag() {
  const items = ['1', '2', '3']
  return (
    <div style={{ padding: '20px' }}>
      <h1>Teste de Drag and Drop</h1>
      <DndContext collisionDetection={closestCenter}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map(id => <SortableItem key={id} id={id} />)}
        </SortableContext>
      </DndContext>
    </div>
  )
}