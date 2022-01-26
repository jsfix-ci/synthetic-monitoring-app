import { Alerting } from 'components/Alerting';
import {
  ALERT_PROBE_DURATION_RECORDING_EXPR,
  ALERT_PROBE_DURATION_RECORDING_METRIC,
  ALERT_PROBE_SUCCESS_RECORDING_EXPR,
  ALERT_PROBE_SUCCESS_RECORDING_METRIC,
  ALERT_SSL_CERT_VALIDITY_RECORDING_EXPR,
  ALERT_SSL_CERT_VALIDITY_RECORDING_METRIC,
  DEFAULT_ALERT_NAMES_BY_FAMILY_AND_SENSITIVITY,
} from 'components/constants';
import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { InstanceContext } from 'contexts/InstanceContext';
import { getInstanceMock } from 'datasource/__mocks__/DataSource';
import { AppPluginMeta, DataSourceSettings } from '@grafana/data';
import { AlertFamily, AlertRule, AlertSensitivity, GlobalSettings } from 'types';
import * as useAlerts from 'hooks/useAlerts';

jest.setTimeout(30000);

const setDefaultRules = jest.fn();
const setRules = jest.fn().mockImplementation(() => Promise.resolve({ ok: true }));

const renderAlerting = async ({ withAlerting = true } = {}) => {
  const api = getInstanceMock();
  const instance = {
    api,
    alertRuler: withAlerting ? (({ url: 'alertUrl' } as unknown) as DataSourceSettings) : undefined,
  };
  const meta = {} as AppPluginMeta<GlobalSettings>;
  return render(
    <InstanceContext.Provider value={{ instance, loading: false, meta }}>
      <Alerting />
    </InstanceContext.Provider>
  );
};

const mockAlertsHook = () => {
  jest
    .spyOn(useAlerts, 'useAlerts')
    .mockImplementationOnce(() => ({
      alertRules: [],
      alertError: '',
      setDefaultRules,
      setRules,
    }))
    .mockImplementation(() => ({
      alertRules: useAlerts.defaultRules.rules as AlertRule[],
      alertError: '',
      setDefaultRules,
      setRules,
    }));
};

const toggleSection = async (sectionName: string): Promise<HTMLElement> => {
  const sectionHeader = await screen.findByText(sectionName);
  userEvent.click(sectionHeader);
  return sectionHeader.parentElement?.parentElement ?? new HTMLElement();
};

it('adds default alerts and edits alerts', async () => {
  mockAlertsHook();
  await renderAlerting();
  const defaultAlertButton = await screen.findByRole('button', { name: 'Populate default alerts' });
  userEvent.click(defaultAlertButton);
  await waitFor(() => expect(defaultAlertButton).not.toBeDisabled());
  expect(setDefaultRules).toHaveBeenCalledTimes(1);

  const button = await screen.findByRole('button', {
    name: DEFAULT_ALERT_NAMES_BY_FAMILY_AND_SENSITIVITY[AlertFamily.ProbeSuccess][AlertSensitivity.High],
  });
  userEvent.click(button);

  const alertNameInput = await screen.findByLabelText('Alert name');
  expect(alertNameInput).toHaveValue(
    DEFAULT_ALERT_NAMES_BY_FAMILY_AND_SENSITIVITY[AlertFamily.ProbeSuccess][AlertSensitivity.High]
  );
  await userEvent.clear(alertNameInput);
  await userEvent.type(alertNameInput, 'A different name');

  const threshold = await screen.findByTestId('threshold');
  expect(threshold).toHaveValue(95);
  await userEvent.clear(threshold);
  await userEvent.type(threshold, '25');

  const timeCount = await screen.findByTestId('timeCount');
  expect(timeCount).toHaveValue(5);
  await userEvent.clear(timeCount);
  await userEvent.type(timeCount, '2');

  const timeUnit = await screen.findAllByTestId('select');
  userEvent.selectOptions(timeUnit[1], 's');

  const labels = await toggleSection('Labels');
  const addLabelButton = await within(labels).findByRole('button', { name: 'Add label' });
  userEvent.click(addLabelButton);
  const labelNameInputs = await within(labels).findAllByPlaceholderText('Name');
  await userEvent.type(labelNameInputs[labelNameInputs.length - 1], 'a_label_name');
  const labelValueInputs = await within(labels).findAllByPlaceholderText('Value');
  await userEvent.type(labelValueInputs[labelValueInputs.length - 1], 'a_label_value');

  const annotations = await toggleSection('Annotations');
  const addAnnotationsButton = await within(annotations).findByRole('button', { name: 'Add annotation' });
  userEvent.click(addAnnotationsButton);
  const annotationNameInputs = await within(annotations).findAllByPlaceholderText('Name');
  await userEvent.type(annotationNameInputs[annotationNameInputs.length - 1], 'an_annotation_name');
  const annotationValueInputs = await within(annotations).findAllByPlaceholderText('Value');
  userEvent.paste(annotationValueInputs[annotationValueInputs.length - 1], 'an annotation value');

  const submitButton = await screen.findByRole('button', { name: 'Save alert' });
  userEvent.click(submitButton);
  await waitFor(() => {
    expect(setRules).toHaveBeenCalledTimes(1);
  });
  expect(setRules).toHaveBeenCalledWith([
    {
      expr: ALERT_PROBE_SUCCESS_RECORDING_EXPR,
      record: ALERT_PROBE_SUCCESS_RECORDING_METRIC,
    },
    {
      expr: ALERT_SSL_CERT_VALIDITY_RECORDING_EXPR,
      record: ALERT_SSL_CERT_VALIDITY_RECORDING_METRIC,
    },
    {
      expr: ALERT_PROBE_DURATION_RECORDING_EXPR,
      record: ALERT_PROBE_DURATION_RECORDING_METRIC,
    },
    // probe duration
    {
      alert: 'SyntheticMonitoringProbeDurationAtHighSensitivity',
      annotations: {
        description:
          '{{ $labels.check_name }} check, job {{ $labels.job }}, instance {{ $labels.instance }}, on probe {{ $labels.probe }} has a duration of {{ printf "%.3f" $value }} seconds.',
        summary: 'probe duration above 100 ms',
      },
      expr: 'instance_job_probe_severity:probe_all_duration_seconds:mean5m{alert_sensitivity="high"} * 1000 > 100',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
    {
      alert: 'SyntheticMonitoringProbeDurationAtMediumSensitivity',
      annotations: {
        description:
          '{{ $labels.check_name }} check, job {{ $labels.job }}, instance {{ $labels.instance }}, on probe {{ $labels.probe }} has a duration of {{ printf "%.3f" $value }} seconds.',
        summary: 'probe duration above 150 ms',
      },
      expr: 'instance_job_probe_severity:probe_all_duration_seconds:mean5m{alert_sensitivity="medium"} * 1000 > 150',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
    {
      alert: 'SyntheticMonitoringProbeDurationAtLowSensitivity',
      annotations: {
        description:
          '{{ $labels.check_name }} check, job {{ $labels.job }}, instance {{ $labels.instance }}, on probe {{ $labels.probe }} has a duration of {{ printf "%.3f" $value }} seconds.',
        summary: 'probe duration above 200 ms',
      },
      expr: 'instance_job_probe_severity:probe_all_duration_seconds:mean5m{alert_sensitivity="low"} * 1000 > 200',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
    // probe success
    {
      alert: 'A different name',
      annotations: {
        an_annotation_name: 'an annotation value',
        description:
          'check job {{ $labels.job }} instance {{ $labels.instance }} has a success rate of {{ printf "%.1f" $value }}%.',
        summary: 'check success below 95%',
      },
      expr: 'instance_job_severity:probe_success:mean5m{alert_sensitivity="high"} < 25',
      for: '2s',
      labels: {
        a_label_name: 'a_label_value',
        namespace: 'synthetic_monitoring',
      },
    },
    {
      alert: 'SyntheticMonitoringCheckFailureAtMediumSensitivity',
      annotations: {
        description:
          'check job {{ $labels.job }} instance {{ $labels.instance }} has a success rate of {{ printf "%.1f" $value }}%.',
        summary: 'check success below 90%',
      },
      expr: 'instance_job_severity:probe_success:mean5m{alert_sensitivity="medium"} < 90',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
    {
      alert: 'SyntheticMonitoringCheckFailureAtLowSensitivity',
      annotations: {
        description:
          'check job {{ $labels.job }} instance {{ $labels.instance }} has a success rate of {{ printf "%.1f" $value }}%.',
        summary: 'check success below 75%',
      },
      expr: 'instance_job_severity:probe_success:mean5m{alert_sensitivity="low"} < 75',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
    // SSL certificate expiration
    {
      alert: 'SyntheticMonitoringSSLCertExpiryAtHighSensitivity',
      annotations: {
        description:
          'SSL certificate for instance {{ $labels.instance }} and job {{ $labels.job }} is expiring in {{ printf "%.1f" $value }} days.',
        summary: `SSL certificate expiration in 90 days`,
      },
      expr: 'instance_job_severity:ssl_cert_validity_days:min{alert_sensitivity="high"} < 90',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
    {
      alert: 'SyntheticMonitoringSSLCertExpiryAtMediumSensitivity',
      annotations: {
        description:
          'SSL certificate for instance {{ $labels.instance }} and job {{ $labels.job }} is expiring in {{ printf "%.1f" $value }} days.',
        summary: `SSL certificate expiration in 60 days`,
      },
      expr: 'instance_job_severity:ssl_cert_validity_days:min{alert_sensitivity="medium"} < 60',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
    {
      alert: 'SyntheticMonitoringSSLCertExpiryAtLowSensitivity',
      annotations: {
        description:
          'SSL certificate for instance {{ $labels.instance }} and job {{ $labels.job }} is expiring in {{ printf "%.1f" $value }} days.',
        summary: `SSL certificate expiration in 30 days`,
      },
      expr: 'instance_job_severity:ssl_cert_validity_days:min{alert_sensitivity="low"} < 30',
      for: '5m',
      labels: {
        namespace: 'synthetic_monitoring',
      },
    },
  ]);
});
