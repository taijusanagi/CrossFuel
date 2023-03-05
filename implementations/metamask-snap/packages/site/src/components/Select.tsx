import { ChangeEvent } from 'react';
import styled from 'styled-components';

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: Option[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
};

const SelectBox = styled.select`
  padding: 0.5em;
  border-radius: 5px;
  border: none;
  background-color: #f2f2f2;
  color: #333;
  cursor: pointer;
`;

const Option = styled.option``;

const SelectWrapper = styled.div``;

export const Select = ({ options, onChange }: SelectProps) => {
  return (
    <SelectWrapper>
      <SelectBox onChange={onChange}>
        {options.map((option) => (
          <Option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </Option>
        ))}
      </SelectBox>
    </SelectWrapper>
  );
};
