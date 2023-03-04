import { ChangeEvent } from 'react';
import styled from 'styled-components';

type CheckBoxProps = {
  className?: string;
  label: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
`;

const Label = styled.span`
  font-weight: bold;
  margin-right: 0.75rem;
`;

const Icon = styled.svg`
  fill: none;
  stroke: white;
  stroke-width: 2px;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  border: 0;
  clip: rect(0 0 0 0);
  clippath: inset(50%);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
`;

const StyledCheckbox = styled.div<{ checked: boolean }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  background: ${(props) => (props.checked ? '#F0DC82' : '#f2f2f2')};
  border-radius: 3px;
  transition: all 150ms;

  ${Icon} {
    visibility: ${(props) => (props.checked ? 'visible' : 'hidden')};
  }
`;

export const Checkbox = ({
  className,
  label,
  checked,
  onChange,
}: CheckBoxProps) => {
  return (
    <CheckboxContainer className={className}>
      <Label>{label}</Label>
      <StyledCheckbox checked={checked}>
        <HiddenCheckbox checked={checked} onChange={onChange} />
        <Icon viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </Icon>
      </StyledCheckbox>
    </CheckboxContainer>
  );
};
