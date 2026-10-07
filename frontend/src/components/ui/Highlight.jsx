/**
 * Highlight component used inside headings to draw attention to keywords.
 * Renders an electric-violet block with white text and tight padding.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Text or element to highlight
 * @param {string} [props.className=''] - Additional classes
 */
export function Highlight({ children, className = '', ...props }) {
  return (
    <span
      className={`inline-block bg-brand text-white px-[0.2em] py-[0.05em] rounded-none leading-normal ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Highlight;
