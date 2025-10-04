const Modal = ({ children, isOpen, className, radius = "rounded-xl" }) => {
  return (
    isOpen && (
      <div
        className={`absolute z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[300px] w-max min-h-[300px] bg-white p-8 ${radius} ${className}`}
      >
        {children}
        
      </div>
    )
  );
};

export default Modal;
