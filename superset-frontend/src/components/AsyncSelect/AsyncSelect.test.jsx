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
import React from 'react';
import { fireEvent, render, waitFor } from 'spec/helpers/testing-library';
import fetchMock from 'fetch-mock';
import AsyncSelect from 'src/components/AsyncSelect';

jest.mock('src/components/DeprecatedSelect', () => ({
  Select: ({ onChange }) => (
    <input type="text" data-test="mock-select" onChange={onChange} />
  ),
}));

afterAll(fetchMock.reset);
afterEach(fetchMock.resetHistory);

const dataEndpoint = '/chart/api/read';
const dataGlob = 'glob:*/chart/api/read';
fetchMock.get(dataGlob, []);
fetchMock.resetHistory();

const options = [
  { value: 1, label: 'main' },
  { value: 2, label: 'another' },
];
const mockedProps = {
  dataEndpoint,
  onChange: () => {},
  placeholder: 'Select...',
  mutator: () => options,
  valueRenderer: opt => opt.label,
};

test('has one select', () => {
  const { getByTestId } = render(<AsyncSelect {...mockedProps} />);
  expect(getByTestId('mock-select')).toBeInTheDocument();
});

test('calls onChange on select change', () => {
  const onChangeSpy = jest.fn();
  const { getByTestId } = render(
    <AsyncSelect {...mockedProps} onChange={onChangeSpy} />,
  );

  fireEvent.change(getByTestId('mock-select'), { target: { value: 1 } });
  expect(onChangeSpy.mock.calls).toHaveLength(1);
});

describe('auto select', () => {
  test('should not call onChange if autoSelect=false', () =>
    new Promise(done => {
      expect.assertions(2);

      const onChangeSpy = jest.fn();
      render(<AsyncSelect {...mockedProps} onChange={onChangeSpy} />);

      setTimeout(() => {
        expect(fetchMock.calls(dataGlob)).toHaveLength(1);
        expect(onChangeSpy.mock.calls).toHaveLength(0);
        done();
      });
    }));

  test('should auto select the first option if autoSelect=true', () =>
    new Promise(done => {
      expect.assertions(3);

      const onChangeSpy = jest.fn();
      render(
        <AsyncSelect {...mockedProps} onChange={onChangeSpy} autoSelect />,
      );

      setTimeout(() => {
        expect(fetchMock.calls(dataGlob)).toHaveLength(1);
        expect(onChangeSpy.mock.calls).toHaveLength(1);
        expect(onChangeSpy).toBeCalledWith(options[0]);
        done();
      });
    }));

  test('should not auto select when value prop is set and autoSelect=true', () =>
    new Promise(done => {
      expect.assertions(3);

      const onChangeSpy = jest.fn();
      const { getByTestId } = render(
        <AsyncSelect
          {...mockedProps}
          value={2}
          onChange={onChangeSpy}
          autoSelect
        />,
      );

      setTimeout(() => {
        expect(fetchMock.calls(dataGlob)).toHaveLength(1);
        expect(onChangeSpy.mock.calls).toHaveLength(0);
        expect(getByTestId('mock-select')).toBeInTheDocument();
        done();
      });
    }));

  test('should call onAsyncError if there is an error fetching options', async () => {
    expect.assertions(3);

    const errorEndpoint = 'async/error/';
    const errorGlob = 'glob:*async/error/';
    fetchMock.get(errorGlob, { throws: 'error' });

    const onAsyncError = jest.fn();
    render(
      <AsyncSelect
        {...mockedProps}
        dataEndpoint={errorEndpoint}
        onAsyncError={onAsyncError}
      />,
    );

    // Fails then retries thrice whenever fetching options, which happens twice:
    // once on component mount.
    await waitFor(() => expect(fetchMock.calls(errorGlob)).toHaveLength(4), {
      timeout: 5000,
    });

    expect(onAsyncError.mock.calls).toHaveLength(1);
    expect(onAsyncError).toBeCalledWith('error');
  });
});
