'use client'

import { useState } from 'react'
import { HealthTimeline } from '@/components/pets/HealthTimeline'
import { Modal } from '@/components/ui/Modal'
import { PlusIcon } from '@/components/ui/Icons'
import type { HealthRecordView, Species } from '@/lib/types'
import { VetNoteInterpreter } from './VetNoteInterpreter'
import { VetVisitForm } from './VetVisitForm'

type Editing = { mode: 'new' } | { mode: 'edit'; record: HealthRecordView } | null

export function HealthWorkspace({
  petId,
  petName,
  species,
  records,
  canUploadDocuments,
  canInterpret,
}: {
  petId: string
  petName: string
  species: Species | null
  records: HealthRecordView[]
  canUploadDocuments: boolean
  canInterpret: boolean
}) {
  const [editing, setEditing] = useState<Editing>(null)
  const close = () => setEditing(null)

  return (
    <section aria-labelledby="history">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="history" className="font-display text-lg font-bold tracking-tight">
          Health history
        </h2>
        <button onClick={() => setEditing({ mode: 'new' })} className="btn-primary">
          <PlusIcon size={16} />
          Add record
        </button>
      </div>

      <HealthTimeline records={records} onEdit={(record) => setEditing({ mode: 'edit', record })} />

      <Modal open={editing !== null} onClose={close} title={editing?.mode === 'edit' ? 'Edit record' : `New record for ${petName}`} wide>
        {editing && (
          <VetVisitForm
            key={editing.mode === 'edit' ? editing.record.id : 'new'}
            petId={petId}
            species={species}
            record={editing.mode === 'edit' ? editing.record : undefined}
            canUploadDocuments={canUploadDocuments}
            renderVetNotes={(notes, setNotes) => (
              <VetNoteInterpreter petId={petId} petName={petName} notes={notes} onChange={setNotes} canInterpret={canInterpret} />
            )}
            onDone={close}
          />
        )}
      </Modal>
    </section>
  )
}
