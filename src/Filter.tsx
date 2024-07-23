import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ActionMeta, Button, Field, HorizontalGroup, Input, Select, VerticalGroup, RadioButtonGroup } from '@grafana/ui';
import { DataSource } from 'DataSource';
import React, { useState } from 'react';
import { GADataSourceOptions, GADimensionFilterType, GAFilterExpression, GAFilterExpressionList, GAInListFilter, GAQuery, GAStringFilter, GAStringFilterMatchType } from 'types';

type Props = QueryEditorProps<DataSource, GAQuery, GADataSourceOptions>;
type OperatorType = 'orGroup' | 'andGroup';

export const DimensionFilter = ({ props }: { props: Props }) => {
  const [operatorType, setOperatorType] = useState<OperatorType>(
    props.query.dimensionFilter?.andGroup !== undefined ? 'andGroup' : 'orGroup'
  );
  const [dimensionFilter, setDimensionFilter] = useState(props.query.dimensionFilter)
  // const filterAction = ["dimensionChanged", "metricChanged", "filterTypeChanged", "filterOperationChanged"] as Array<string>

  const dimensionFilterType = Object.keys(GADimensionFilterType)
    .filter(x => isNaN(parseInt(x, 10)))
    .reduce((acc: Array<SelectableValue<string>>, val: string) => {
      acc.push({
        label: val.toString().toLowerCase(),
        value: val
      } as SelectableValue<string>)
      return acc
    }, [])

  const stringFilterMatchType = Object.keys(GAStringFilterMatchType)
    .filter(x => isNaN(parseInt(x, 10)))
    .reduce((acc: Array<SelectableValue<string>>, val: string) => {
      acc.push({
        label: val.toString().toLowerCase(),
        value: val
      } as SelectableValue<string>)
      return acc
    }, [])

  const addFields = () => {
    const { query, onChange } = props;

    let filter = {
      filter: {
        fieldName: '',
        filterType: undefined
      }
    } as GAFilterExpression

    if (dimensionFilter[operatorType] === undefined) {
      let operatorGroup = {
        expressions: []
      } as GAFilterExpressionList
      dimensionFilter[operatorType] = operatorGroup
    }

    dimensionFilter[operatorType]!.expressions.push(
      filter
    )
    setDimensionFilter(dimensionFilter)
    onChange({ ...query, dimensionFilter })
  }

  const removeFields = (index: number) => {
    const { query, onChange } = props;

    dimensionFilter[operatorType]!.expressions.splice(index, 1)
    if (dimensionFilter[operatorType]?.expressions.length === 0) {
      setDimensionFilter({})
      onChange({ ...query, dimensionFilter: {} })
    } else {
      setDimensionFilter(dimensionFilter)
      onChange({ ...query, dimensionFilter })
    }
  }
  const filedValueChange = (value: string, index: number) => {

    let data = [...dimensionFilter[operatorType]!.expressions];
    let targetData = data[index].filter
    const { query, onChange } = props;
    switch (targetData?.filterType) {
      case GADimensionFilterType.STRING:
        if (targetData.stringFilter !== undefined) {
          targetData.stringFilter.value = value
          data[index].filter = targetData
        }
        break;
      case GADimensionFilterType.IN_LIST:
        console.log('IN_LIST', targetData)
        if (targetData.inListFilter !== undefined) {
          targetData.inListFilter.values = value.split(',')
          data[index].filter = targetData
        }
        break;
    }
    dimensionFilter[operatorType]!.expressions = data
    onChange({
      ...query, dimensionFilter
    })
  }
  const fieldNameChange = (value: SelectableValue<string>, action: ActionMeta, index: number) => {
    let data = [...dimensionFilter[operatorType]!.expressions];
    let targetData = data[index].filter!
    const { query, onChange } = props;
    if (value.value !== undefined) {
      switch (action.name) {
        case "dimensionChanged":
          targetData.fieldName = value.value
          break;
        case "filterTypeChanged":
          if (value.value !== undefined) {
            const filterType = GADimensionFilterType[value.value as keyof typeof GADimensionFilterType]
            targetData.filterType = filterType
            if (filterType === GADimensionFilterType.IN_LIST) {
              const inListFilter = {
                caseSensitive: true,
                values: targetData.inListFilter?.values || []
              } as GAInListFilter
              targetData.inListFilter = inListFilter
            } else if (filterType === GADimensionFilterType.STRING) {
              const stringFilter = {
                matchType: GAStringFilterMatchType.MATCH_TYPE_UNSPECIFIED,
                caseSensitive: true,
                value: targetData.stringFilter?.value || ''
              } as GAStringFilter
              targetData.stringFilter = stringFilter
            }
          }
          break;
        case "matchTypeChanged":
          if (targetData.filterType === GADimensionFilterType.STRING) {
            const stringFilter = {
              matchType: GAStringFilterMatchType[value.value as keyof typeof GAStringFilterMatchType],
              caseSensitive: true,
              value: targetData.stringFilter?.value || ''
            } as GAStringFilter
            targetData.stringFilter = stringFilter
          }
      }
    }
    data[index].filter! = targetData
    dimensionFilter[operatorType]!.expressions = data
    onChange({
      ...query, dimensionFilter
    })
  }

  // const fieldNameChange = (value: SelectableValue<string>, index: number) => {
  //   let data = [...filterFields];
  //   const { query, onChange} = props;

  //   data[index].filedName = value.value || ''
  //   setFormFields(data);
  //   console.log('filterFields', filterFields)
  //   onChange({...query, metricFilter: data[index]})
  // }

  const operatorOnChange = (newOperator: OperatorType) => {
      const { query, onChange } = props;
      dimensionFilter[newOperator] = dimensionFilter[operatorType]
      dimensionFilter[operatorType] = undefined;
      onChange({
        ...query, dimensionFilter
      });
      setOperatorType(newOperator);
  }


  return (
    <>
      <div className="gf-form">
        <VerticalGroup>{dimensionFilter[operatorType]?.expressions.map(({filter}, index) => {
            return (
              <div key={`expression-${index}`} style={{ display: 'flex', alignItems: 'center', flexDirection: 'column'}}>
                <HorizontalGroup>
                  <Field label="dimension">
                    <Select
                      options={props.query.selectedDimensions}
                      onChange={(value, action) => {
                        action.name = "dimensionChanged"
                        fieldNameChange(value, action, index)
                      }}
                      value={filter?.fieldName}
                    />
                  </Field>
                  <Field label="filter type">

                    <Select
                      options={dimensionFilterType}
                      onChange={(value, action) => {
                        action.name = "filterTypeChanged"
                        fieldNameChange(value, action, index)
                      }}
                      value={filter?.filterType?.toString()}
                    />
                  </Field>

                  {
                    filter?.filterType === GADimensionFilterType.STRING &&
                    <>
                      <Field label="match type">
                        <Select
                          options={stringFilterMatchType}
                          onChange={(value, action) => {
                            action.name = "matchTypeChanged"
                            fieldNameChange(value, action, index)
                          }}
                          value={filter.stringFilter?.matchType.toString()}
                        />
                      </Field>

                    </>
                  }
                  {
                    filter?.filterType === GADimensionFilterType.STRING &&
                    <>
                      <Field label="value" invalid={filter.stringFilter?.value === ''} error={filter.stringFilter?.value === '' ? 'This input is required' : ''}>
                        <Input required onChange={(e) => {
                          filedValueChange(e.currentTarget.value, index)
                        }}
                          value={filter.stringFilter?.value}
                        ></Input>
                      </Field>
                    </>
                  }
                  {
                    filter?.filterType === GADimensionFilterType.IN_LIST &&
                    <>
                      <Field label="values sperate by comma" invalid={filter.inListFilter?.values.join(',') === ''} error={filter.inListFilter?.values.join(',') === '' ? 'This input is required' : ''} >
                        <Input required onChange={(e) => {
                          filedValueChange(e.currentTarget.value, index)
                        }}
                          value={filter.inListFilter?.values.join(',')}
                        ></Input>
                      </Field>
                    </>
                  }
                  {/* <Field label="filter type" description="filter type"> */}
                  <Button variant='secondary' icon='minus' onClick={() => removeFields(index)} ></Button>
                  <Button variant='secondary' icon='plus' onClick={addFields} ></Button>

                  {/* </Field> */}
                </HorizontalGroup>
                {(index + 1) !== dimensionFilter[operatorType]?.expressions.length && (
                  <RadioButtonGroup options={[
                    { label: 'AND', value: 'andGroup' },
                    { label: 'OR', value: 'orGroup' },
                  ]} value={operatorType} onChange={operatorOnChange} aria-label='query-mode' />)}
              </div>
            )
          })}
          {
            (Object.keys(dimensionFilter).length === 0 || dimensionFilter[operatorType]?.expressions.length === 0) && <Button variant='secondary' icon='plus' onClick={addFields}></Button>
          }
        </VerticalGroup>
        {/* <Field label="filter type" description="filter type"> */}
        {/* </Field> */}
      </div>
    </>
  );
}
