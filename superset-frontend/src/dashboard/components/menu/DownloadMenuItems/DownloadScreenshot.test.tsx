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

import { render, screen, waitFor } from 'spec/helpers/testing-library';
import userEvent from '@testing-library/user-event';
import { Menu } from 'src/components/Menu';
import fetchMock from 'fetch-mock';
import { logging } from '@superset-ui/core';
import { DownloadScreenshotFormat } from './types';
import DownloadScreenshot from './DownloadScreenshot';

const mockAddDangerToast = jest.fn();
const mockLogEvent = jest.fn();
const mockAddSuccessToast = jest.fn();
const mockAddInfoToast = jest.fn();

jest.spyOn(logging, 'error').mockImplementation(() => {});

const defaultProps = () => ({
  text: 'Download',
  dashboardId: '123',
  format: DownloadScreenshotFormat.PDF,
  addDangerToast: mockAddDangerToast,
  addSuccessToast: mockAddSuccessToast,
  addInfoToast: mockAddInfoToast,
  logEvent: mockLogEvent,
});

const renderComponent = () => {
  render(
    <Menu>
      <DownloadScreenshot {...defaultProps()} />
    </Menu>,
    {
      useRedux: true,
    },
  );
};

describe('DownloadScreenshot component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    fetchMock.restore();
  });

  test('renders correctly with the given text', () => {
    renderComponent();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  test('button renders with role="button"', async () => {
    renderComponent();
    const button = screen.getByRole('button', { name: 'Download' });
    expect(button).toBeInTheDocument();
  });

  test('displays error message when API call fails', async () => {
    const props = defaultProps();

    fetchMock.post(
      `glob:*/api/v1/dashboard/${props.dashboardId}/cache_screenshot`,
      {
        status: 400,
        body: {},
      },
    );

    renderComponent();

    userEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(defaultProps().addDangerToast).toHaveBeenCalledWith(
        'The screenshot could not be downloaded. Please, try again later.',
      );
    });
  });

  test('displays success message when API call succeeds', async () => {
    const props = defaultProps();
    fetchMock.post(
      `glob:*/api/v1/dashboard/${props.dashboardId}/cache_screenshot`,
      {
        status: 200,
        body: {
          image_url: 'mocked_image_url',
        },
      },
    );

    fetchMock.get('glob:*/mocked_image_url?download_format=pdf', {
      status: 200,
      body: {},
    });

    renderComponent();

    userEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(props.addInfoToast).toHaveBeenCalledWith(
        'The screenshot is being generated. Please, do not leave the page.',
      );
    });
  });

  test('throws error when no image URL is provided', async () => {
    const props = defaultProps();
    fetchMock.post(
      `glob:*/api/v1/dashboard/${props.dashboardId}/cache_screenshot`,
      {
        status: 200,
        body: {
          image_url: '',
        },
      },
    );

    renderComponent();

    // Simulate the user clicking the download button
    userEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(props.addDangerToast).toHaveBeenCalledWith(
        'The screenshot could not be downloaded. Please, try again later.',
      );
    });
  });

  test('retries fetching image when retrieval fails', async () => {
    jest.useFakeTimers();

    const props = defaultProps();
    const maxRetries = 2;
    const imageUrl = 'glob:*/mocked_image_url?download_format=pdf';
    fetchMock.post(
      `glob:*/api/v1/dashboard/${props.dashboardId}/cache_screenshot`,
      {
        status: 200,
        body: {
          image_url: 'mocked_image_url',
        },
      },
    );

    fetchMock.get(imageUrl, 404);

    // Render the component
    renderComponent();

    // Simulate the user clicking the download button
    userEvent.click(screen.getByRole('button', { name: 'Download' }));

    for (let i = 0; i <= maxRetries; i += 1) {
      jest.advanceTimersByTime(1000);
    }
    await waitFor(() => {
      expect(fetchMock.calls(imageUrl).length).toBeGreaterThan(1);
    });
  });

  test('displays success message when image retrieval succeeds', async () => {
    const props = defaultProps();
    const imageUrl = 'glob:*/mocked_image_url?download_format=pdf';
    fetchMock.post(
      `glob:*/api/v1/dashboard/${props.dashboardId}/cache_screenshot`,
      {
        status: 200,
        body: {
          image_url: 'mocked_image_url',
        },
      },
    );

    fetchMock.get(imageUrl, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
      body: new Blob([], { type: 'image/png' }),
    });

    global.URL.createObjectURL = jest.fn(() => 'mockedObjectURL');
    global.URL.revokeObjectURL = jest.fn();

    // Render the component
    renderComponent();

    // Simulate the user clicking the download button
    userEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(fetchMock.calls(imageUrl).length).toBe(1);
    });

    // Wait for the successful image retrieval message
    await waitFor(() => {
      expect(props.addSuccessToast).toHaveBeenCalledWith(
        'The screenshot is now ready to be downloaded.',
      );
    });
  });
});
