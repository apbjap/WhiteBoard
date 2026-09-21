export default function DisclaimerBanner({ text }) {
  return (
    <aside className="disclaimer" role="note">
      <strong>Not medical advice.</strong>{' '}
      {text ||
        'These are research and community protocol sketches. Approaches vary; this is not a clinical rulebook. Consult a qualified clinician for personal medical decisions.'}{' '}
      Source attributed to Red Fox Peptides protocol library.
    </aside>
  )
}
