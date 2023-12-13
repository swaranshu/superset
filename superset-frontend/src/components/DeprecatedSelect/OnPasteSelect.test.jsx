/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/* eslint-disable no-unused-expressions */
import React from 'react';
import { createEvent, fireEvent, render } from 'spec/helpers/testing-library';
import { OnPasteSelect } from 'src/components/DeprecatedSelect';

const defaultProps = {
  onChange: jest.fn(),
  isMulti: true,
  value: [],
  options: [
    { value: 'United States', label: 'United States' },
    { value: 'China', label: 'China' },
    { value: 'India', label: 'India' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Russian Federation', label: 'Russian Federation' },
    { value: 'Japan', label: 'Japan' },
    { value: 'Mexico', label: 'Mexico' },
  ],
};

test('renders the supplied selectWrap component', () => {
  const { getByRole, getByText } = render(<OnPasteSelect {...defaultProps} />);
  expect(getByRole('textbox')).toBeInTheDocument();
  expect(getByText('Select...')).toBeInTheDocument();
});

test('renders custom selectWrap components', () => {
  const { getByTestId } = render(
    <OnPasteSelect
      {...defaultProps}
      selectWrap={() => <div data-test="custom-select" />}
    />,
  );
  expect(getByTestId('custom-select')).toBeInTheDocument();
});

describe('onPaste', () => {
  const setup = (clipboardData, overrideProps) => {
    const isValidNewOption = jest.fn().mockImplementation(s => !!s.label);
    const onChange = jest.fn();
    const options = [...defaultProps.options];
    const { getByRole } = render(
      <OnPasteSelect
        {...defaultProps}
        options={options}
        onChange={onChange}
        isValidNewOption={isValidNewOption}
        {...overrideProps}
      />,
    );
    const input = getByRole('textbox');
    const paste = createEvent.paste(input, {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: jest.fn().mockReturnValue(clipboardData),
      },
    });
    fireEvent(input, paste);
    return { onChange, isValidNewOption, options };
  };

  test('calls onChange with pasted comma separated values', () => {
    const { onChange, isValidNewOption } = setup(
      ' United States, China, India, Canada, ',
    );
    const expected = defaultProps.options.slice(0, 4);
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(5);
  });

  test('calls onChange with pasted new line separated values', () => {
    const { onChange, isValidNewOption } = setup(
      'United States\nChina\nRussian Federation\nIndia',
    );
    const expected = [
      defaultProps.options[0],
      defaultProps.options[1],
      defaultProps.options[4],
      defaultProps.options[2],
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(expected.length);
  });

  test('calls onChange with pasted tab separated values', () => {
    const { onChange, isValidNewOption } = setup(
      'Russian Federation\tMexico\tIndia\tCanada',
    );
    const expected = [
      defaultProps.options[4],
      defaultProps.options[6],
      defaultProps.options[2],
      defaultProps.options[3],
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(expected.length);
  });

  test('calls onChange without duplicate values and adds new comma separated values', () => {
    const { onChange, isValidNewOption, options } = setup(
      'China, China, China, China, Mexico, Mexico, Chi na, Mexico, ',
    );
    const expected = [
      defaultProps.options[1],
      defaultProps.options[6],
      { label: 'Chi na', value: 'Chi na' },
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(4);
    expect(options[0].value).toBe(expected[2].value);
  });

  test('calls onChange without duplicate values and parses new line separated values', () => {
    const { onChange, isValidNewOption } = setup(
      'United States\nCanada\nMexico\nUnited States\nCanada',
    );
    const expected = [
      defaultProps.options[0],
      defaultProps.options[3],
      defaultProps.options[6],
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(expected.length);
  });

  test('calls onChange without duplicate values and parses tab separated values', () => {
    const { onChange, isValidNewOption } = setup(
      'China\tIndia\tChina\tRussian Federation\tJapan\tJapan',
    );
    const expected = [
      defaultProps.options[1],
      defaultProps.options[2],
      defaultProps.options[4],
      defaultProps.options[5],
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(expected.length);
  });

  test('calls onChange with currently selected values and new comma separated values', () => {
    const value = ['United States', 'Canada', 'Mexico'];
    const { onChange, isValidNewOption } = setup(
      'United States, Canada, Japan, India',
      { value },
    );
    const expected = [
      defaultProps.options[0],
      defaultProps.options[3],
      defaultProps.options[6],
      defaultProps.options[5],
      defaultProps.options[2],
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(
      expected.length - value.length,
    );
  });

  test('calls onChange with currently selected values and new "new line" separated values', () => {
    const value = ['China', 'India', 'Japan'];
    const { onChange, isValidNewOption } = setup('Mexico\nJapan\nIndia', {
      value,
    });
    const expected = [
      defaultProps.options[1],
      defaultProps.options[2],
      defaultProps.options[5],
      defaultProps.options[6],
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(
      expected.length - value.length,
    );
  });

  test('calls onChange with currently selected values and new tab separated values', () => {
    const value = ['United States', 'Canada', 'Mexico', 'Russian Federation'];
    const { onChange, isValidNewOption } = setup(
      'United States\tCanada\tJapan\tIndia',
      {
        value,
      },
    );
    const expected = [
      defaultProps.options[0],
      defaultProps.options[3],
      defaultProps.options[6],
      defaultProps.options[4],
      defaultProps.options[5],
      defaultProps.options[2],
    ];
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(isValidNewOption).toHaveBeenCalledTimes(
      expected.length - value.length,
    );
  });
});
