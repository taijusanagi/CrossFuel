import React from 'react';
import styled from 'styled-components';

type TextInputProps = {
  placeholder?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const Input = styled.input`
  font-size: 12px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: none;
  outline: none;
  width: 100%;
  &:hover,
  &:focus {
    border-color: #0074d9;
  }
`;

export const TextInput = ({ placeholder, value, onChange }: TextInputProps) => {
  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
};
