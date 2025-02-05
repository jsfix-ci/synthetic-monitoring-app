import { GrafanaTheme } from '@grafana/data';
import { Button, HorizontalGroup, Tooltip, useStyles } from '@grafana/ui';
import React from 'react';
import { css, cx } from '@emotion/css';
import { Label } from 'types';
import { CheckCardLabel } from 'components/CheckCardLabel';

const getStyles = (theme: GrafanaTheme) => ({
  checkDetails: css`
    font-size: ${theme.typography.size.sm};
    line-height: ${theme.typography.lineHeight.sm};
    white-space: nowrap;
    display: flex;
    align-items: center;
    width: 370px;
  `,
  labelWidth: css`
    max-width: 350px;
  `,
});

interface Props {
  frequency: number;
  activeSeries?: number;
  probeLocations: number;
  className?: string;
  labelCount?: number;
  labels?: Label[];
  onLabelClick?: (label: Label) => void;
}

export const CheckListItemDetails = ({
  frequency,
  activeSeries,
  probeLocations,
  className,
  labels,
  onLabelClick,
}: Props) => {
  const styles = useStyles(getStyles);
  const activeSeriesMessage = activeSeries !== undefined ? `${activeSeries} active series` : null;
  const probeLocationsMessage = probeLocations === 1 ? `${probeLocations} location` : `${probeLocations} locations`;
  return (
    <div className={cx(styles.checkDetails, className)}>
      {frequency / 1000}s frequency &nbsp;&nbsp;<strong>|</strong>&nbsp;&nbsp; {activeSeriesMessage}
      &nbsp;&nbsp;<strong>|</strong>&nbsp;&nbsp; {probeLocationsMessage}
      {labels && onLabelClick && (
        <>
          &nbsp;&nbsp;<strong>|</strong>
          <Tooltip
            placement="bottom-end"
            content={
              <HorizontalGroup justify="flex-end" wrap>
                {labels.map((label: Label, index) => (
                  <CheckCardLabel
                    key={index}
                    label={label}
                    onLabelSelect={onLabelClick}
                    className={styles.labelWidth}
                  />
                ))}
              </HorizontalGroup>
            }
          >
            <Button disabled={labels.length === 0} type="button" fill="text" size="sm">
              View {labels.length} label{labels.length === 1 ? '' : 's'}
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  );
};
