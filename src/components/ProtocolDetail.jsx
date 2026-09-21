function TextList({ items }) {
  if (!items?.length) return null
  return (
    <ul className="text-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function Steps({ steps }) {
  if (!steps?.length) return null
  return (
    <ol className="steps-list">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  )
}

function Section({ id, title, children }) {
  if (!children) return null
  return (
    <section className="detail-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export default function ProtocolDetail({ protocol, templates, resources }) {
  const reconSteps =
    protocol.reconstitution?.steps_text?.length
      ? protocol.reconstitution.steps_text
      : protocol.reconstitution?.uses_standard_template
        ? templates?.reconstitution_standard
        : null

  const storageSteps =
    protocol.storage?.steps_text?.length
      ? protocol.storage.steps_text
      : protocol.storage?.uses_standard_template
        ? templates?.storage_standard
        : null

  const calc = resources?.find((r) => r.id === 'reconstitution-calculator')
  const reconGuide = resources?.find((r) => r.id === 'beginner-reconstitution-guide')

  return (
    <div className="detail-grid">
      {(protocol.warning_text || protocol.kit_note_text) && (
        <div className="warning-panel">
          {protocol.warning_text && (
            <p>
              <strong>Important.</strong> {protocol.warning_text}
            </p>
          )}
          {protocol.kit_note_text && <p>{protocol.kit_note_text}</p>}
        </div>
      )}

      <Section id="vials" title="Vials & strength">
        {protocol.vials?.length ? (
          <div className="vial-table-wrap">
            <table className="vial-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>BAC water options</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {protocol.vials.map((v, i) => (
                  <tr key={i}>
                    <td>
                      {v.amount} {v.amount_unit}
                    </td>
                    <td>
                      {(v.bac_water_ml_options || [])
                        .map((ml) => `${ml} mL`)
                        .join(', ') || '—'}
                    </td>
                    <td>
                      {v.bac_water_ml_default != null
                        ? `${v.bac_water_ml_default} mL`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : protocol.premixed ? (
          <dl className="kv-list">
            <div>
              <dt>Concentration</dt>
              <dd>
                {protocol.premixed.concentration} {protocol.premixed.unit}
              </dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{protocol.premixed.volume_ml} mL</dd>
            </div>
            <div>
              <dt>Carrier</dt>
              <dd>{protocol.premixed.oil ? 'Oil' : 'Aqueous'}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">No vial options recorded for this entry.</p>
        )}
        {protocol.bac_note_text && (
          <p className="note-callout">{protocol.bac_note_text}</p>
        )}
        {Array.isArray(protocol.premixed?.handling_text) && (
          <TextList items={protocol.premixed.handling_text} />
        )}
      </Section>

      {protocol.blend && (
        <Section id="blend" title="Blend composition">
          <p>
            <strong>{protocol.blend.label}</strong>
            {protocol.blend.ratio ? ` · ${protocol.blend.ratio}` : ''}
          </p>
          {protocol.blend.components?.length > 0 && (
            <ul className="text-list">
              {protocol.blend.components.map((c, i) => (
                <li key={i}>
                  {c.name}
                  {c.ratio_part != null ? ` (${c.ratio_part})` : ''}
                </li>
              ))}
            </ul>
          )}
          {protocol.blend.dose_by && (
            <p className="muted">Dosed by: {protocol.blend.dose_by}</p>
          )}
          {protocol.blend.combined_vial_mg != null && (
            <p className="muted">
              Combined vial: {protocol.blend.combined_vial_mg} mg
            </p>
          )}
        </Section>
      )}

      {reconSteps && (
        <Section
          id="reconstitution"
          title={protocol.entry_type === 'premixed' ? 'Handling' : 'Reconstitution'}
        >
          <Steps steps={reconSteps} />
          {reconGuide && protocol.entry_type !== 'premixed' && (
            <p className="ext-link-row">
              <a href={reconGuide.url} target="_blank" rel="noreferrer">
                Beginner reconstitution guide
              </a>
            </p>
          )}
        </Section>
      )}

      {protocol.protocol_blocks?.length > 0 && (
        <Section id="protocol" title="Suggested protocol">
          <div className="protocol-blocks">
            {protocol.protocol_blocks.map((block, i) => (
              <article key={i} className="protocol-block">
                {block.label && <h3>{block.label}</h3>}
                <p>{block.text}</p>
              </article>
            ))}
          </div>
        </Section>
      )}

      {protocol.dosing_text?.length > 0 && (
        <Section id="dosing" title="Dosing detail">
          <TextList items={protocol.dosing_text} />
          {calc && (
            <p className="ext-link-row">
              <a href={calc.url} target="_blank" rel="noreferrer">
                Reconstitution calculator
              </a>
            </p>
          )}
        </Section>
      )}

      {protocol.duration_text && (
        <Section id="duration" title="Duration">
          <p>{protocol.duration_text}</p>
        </Section>
      )}

      {protocol.notes_text?.length > 0 && (
        <Section id="notes" title="Notes">
          <TextList items={protocol.notes_text} />
        </Section>
      )}

      {storageSteps && (
        <Section id="storage" title="Storage">
          <Steps steps={storageSteps} />
        </Section>
      )}

      <Section id="source" title="Source & product">
        <dl className="kv-list">
          <div>
            <dt>Library source</dt>
            <dd>
              <a
                href={
                  protocol.source?.hub_url ||
                  'https://www.redfoxpeptides.is/protocol-library/'
                }
                target="_blank"
                rel="noreferrer"
              >
                Red Fox Peptides protocol library
              </a>
            </dd>
          </div>
          <div>
            <dt>Product page</dt>
            <dd>
              <a href={protocol.product_url} target="_blank" rel="noreferrer">
                View on Red Fox Peptides
              </a>
            </dd>
          </div>
        </dl>
        <p className="fine-print">
          Research &amp; community protocol sketches only — not medical advice.
          Content framed from vendor community practice; verify against primary
          sources before any research use.
        </p>
      </Section>
    </div>
  )
}
