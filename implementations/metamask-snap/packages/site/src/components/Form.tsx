import { ReactNode } from 'react';
import styled from 'styled-components';

type FormProps = {
  label: string;
  input: ReactNode;
};

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1em;
`;

const Label = styled.label`
  margin-bottom: 0.5em;
  font-weight: bold;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
`;

export const Form = ({ label, input }: FormProps) => {
  return (
    <FormGroup>
      <Label>{label}</Label>
      <InputWrapper>{input}</InputWrapper>
    </FormGroup>
  );
};
