import { ChangeEvent } from 'react';
import styled from 'styled-components';

type Option = {
  value: string;
  label: string;
};

type SelectProps = {
  options: Option[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
};

const SelectBox = styled.select`
  font-size: ${({ theme }) => theme.fontSizes.small};
  padding: 0.5em;
  border-radius: 5px;
  border: none;
  background-color: #f7f7f7;
  color: #333;
`;

const Option = styled.option`
  font-size: ${({ theme }) => theme.fontSizes.medium};
`;

const SelectWrapper = styled.div``;

export const Select = ({
  options,
  onChange,
  disabled = false,
}: SelectProps) => {
  return (
    <SelectWrapper>
      <SelectBox disabled={disabled} onChange={onChange}>
        {options.map((option) => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </SelectBox>
    </SelectWrapper>
  );
};
