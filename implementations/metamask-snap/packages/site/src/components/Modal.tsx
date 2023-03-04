import { ReactNode } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  position: relative;
  min-width: 300px;
  max-width: 400px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ModalTitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  margin: 0;
`;

const ModalCloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  &:focus,
  &:active,
  &:hover {
    border: none;
    outline: none;
  }
`;

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="#fff"
  >
    <path
      fill="#000000"
      d="M19.8,5.6l-0.4-0.4c-0.5-0.5-1.3-0.5-1.8,0L12,10.2L6.4,4.6c-0.5-0.5-1.3-0.5-1.8,0l-0.4,0.4c-0.5,0.5-0.5,1.3,0,1.8L10.2,12L4.6,17.6c-0.5,0.5-0.5,1.3,0,1.8l0.4,0.4c0.5,0.5,1.3,0.5,1.8,0L12,13.8l5.6,5.6c0.5,0.5,1.3,0.5,1.8,0l0.4-0.4c0.5-0.5,0.5-1.3,0-1.8L13.8,12L19.4,6.4C20,5.9,20,6.1,19.8,5.6z"
    />
  </svg>
);

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
`;

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
};

export const Modal = ({ children, onClose, title, footer }: ModalProps) => {
  const handleClose = () => {
    onClose();
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <ModalHeader>
          {title && <ModalTitle>{title}</ModalTitle>}
          <ModalCloseButton onClick={handleClose}>
            <CloseIcon />
          </ModalCloseButton>
        </ModalHeader>
        {children}
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </ModalOverlay>
  );
};
