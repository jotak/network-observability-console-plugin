import { TextInput, ValidatedOptions } from '@patternfly/react-core';
import { mount } from 'enzyme';
import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { findFilter } from '../../../utils/filter-definitions';
import TextFilter, { TextFilterProps } from '../text-filter';

const t = (k: string) => k;

describe('<TextFilter />', () => {
  const props: TextFilterProps = {
    filterDefinition: findFilter(t, 'src_name')!,
    indicator: ValidatedOptions.default,
    addFilter: jest.fn(),
    setMessageWithDelay: jest.fn(),
    setIndicator: jest.fn(),
  }
  beforeEach(() => {
    props.addFilter = jest.fn();
    props.setIndicator = jest.fn();
  });
  it('should filter name', done => {
    const wrapper = mount(<TextFilter {...props} filterDefinition={findFilter(t, 'src_name')!} />);
    const textInput = wrapper.find(TextInput).at(0);
    const searchButton = wrapper.find('#search-button').at(0);

    expect(textInput).toBeDefined();
    expect(searchButton).toBeDefined();

    // No initial call
    expect(props.addFilter).toHaveBeenCalledTimes(0);
    // Initial setup
    expect(props.setIndicator).toHaveBeenCalledTimes(1);
    expect(textInput.props().validated).toBe(ValidatedOptions.default);

    // Filter for source name
    act(() => {
      textInput.props().onChange!('ABCD', null!);
    });
    setImmediate(() => {
      wrapper.update();
      expect(props.setIndicator).toHaveBeenNthCalledWith(2, ValidatedOptions.success)
      expect(props.addFilter).toHaveBeenCalledTimes(0);

      // Add filter
      searchButton.simulate('click');

      setImmediate(() => {
        wrapper.update();
        expect(props.addFilter).toHaveBeenNthCalledWith(1, { v: 'ABCD' });
        done();
      });
    });
  });

  // it('should filter IP', done => {
  //   const wrapper = mount(<TextFilter {...props} filterDefinition={findFilter('dst_address')!} />);
  //   const textInput = wrapper.find(TextInput).at(0);
  //   const searchButton = wrapper.find('#search-button').at(0);

  //   expect(textInput).toBeDefined();
  //   expect(searchButton).toBeDefined();

  //   // No initial call
  //   expect(props.addFilter).toHaveBeenCalledTimes(0);
  //   // Initial setup
  //   expect(props.setIndicator).toHaveBeenCalledTimes(1);
  //   expect(textInput.props().validated).toBe(ValidatedOptions.default);

  //   // Filter for dest IP
  //   act(() => {
  //     textInput.props().onChange!('10.0.', null!);
  //   });
  //   setImmediate(() => {
  //     wrapper.update();
  //     expect(props.setIndicator).toHaveBeenNthCalledWith(2, ValidatedOptions.success)
  //     expect(props.addFilter).toHaveBeenCalledTimes(0);

  //     // Add filter
  //     searchButton.simulate('click');

  //     setImmediate(() => {
  //       wrapper.update();
  //       expect(props.addFilter).toHaveBeenNthCalledWith(1, { v: 'ABCD' });
  //       done();
  //     });
  //   });
  // });
});


    // //open dropdow and select Src namespace
    // dropdown.simulate('click');
    // wrapper.find(`[id="${ColumnsId.srcnamespace}"]`).at(0).simulate('click');
    // act(() => {
    //   //set text input value and press enter
    //   wrapper.find(TextInput).props().onChange!('EFGH', null!);
    // });
    // wrapper.find(TextInput).at(0).simulate('keypress', { key: 'Enter' });
    // props.filters = props.filters.concat([{ def: findFilter('src_namespace')!, values: [{ v: 'EFGH' }] }]);
    // expect(props.setFilters).toHaveBeenNthCalledWith(++setFilterCallsExpected, props.filters);
    // wrapper.setProps(props as Pick<FiltersToolbarProps, keyof FiltersToolbarProps>);

    // //open dropdow and select valid Src port by name
    // dropdown.simulate('click');
    // wrapper.find(`[id="${ColumnsId.srcport}"]`).at(0).simulate('click');
    // act(() => {
    //   //set search input value
    //   wrapper.find(TextInput).props().onChange!(FTPSrcPortSample.values[0].display!, null!);
    // });
    // //press enter and await for popper to disapear
    // await act(async () => {
    //   wrapper.find(TextInput).at(0).simulate('keypress', { key: 'Enter' });
    // });
    // props.filters = props.filters.concat([FTPSrcPortSample]);
    // expect(props.setFilters).toHaveBeenNthCalledWith(++setFilterCallsExpected, props.filters);
    // wrapper.setProps(props as Pick<FiltersToolbarProps, keyof FiltersToolbarProps>);

    // //open dropdow and select invalid Dst port by name
    // dropdown.simulate('click');
    // wrapper.find(`[id="${ColumnsId.dstport}"]`).at(0).simulate('click');
    // act(() => {
    //   //set search input value, press enter and press button
    //   wrapper.find(TextInput).props().onChange!('no match', null!);
    // });
    // wrapper.find(TextInput).at(0).simulate('keypress', { key: 'Enter' });
    // search.simulate('click');
    // expect(wrapper.find(TextInput).at(0).getElement().props['validated']).toBe(ValidatedOptions.error);
    // expect(props.setFilters).toHaveBeenCalledTimes(setFilterCallsExpected);

    // //clear all filters
    // expect(props.clearFilters).not.toHaveBeenCalled();
    // const button = wrapper
    //   .findWhere(node => {
    //     return node.type() === 'button' && node.text() === 'Clear all filters';
    //   })
    //   .at(0);
    // button.simulate('click');
    // expect(props.clearFilters).toHaveBeenCalledTimes(1);
  // });
  // it('should forward valid IP addresses', async () => {
  //   props.filters = [];
  //   const wrapper = mount(<FiltersToolbar {...props} />);
  //   jest.clearAllMocks();

  //   const dropdown = wrapper.find('#column-filter-toggle').at(0);
  //   const search = wrapper.find('#search-button').at(0);
  //   //open dropdow and select Src address
  //   dropdown.simulate('click');
  //   wrapper.find(`[id="${ColumnsId.srcaddr}"]`).at(0).simulate('click');
  //   act(() => {
  //     //set text input value and press button
  //     wrapper.find(TextInput).props().onChange!('1.2.3.4', null!);
  //   });
  //   search.simulate('click');
  //   expect(props.setFilters).toHaveBeenCalledWith([
  //     {
  //       colId: ColumnsId.srcaddr,
  //       values: [{ v: '1.2.3.4' }]
  //     }
  //   ]);
  // });
  // it('should not forward invalid IP addresses', async () => {
  //   const wrapper = mount(<FiltersToolbar {...props} />);
  //   jest.clearAllMocks();
  //   const dropdown = wrapper.find('#column-filter-toggle').at(0);
  //   const search = wrapper.find('#search-button').at(0);
  //   //open dropdow and select Src address
  //   dropdown.simulate('click');
  //   wrapper.find(`[id="${ColumnsId.srcaddr}"]`).at(0).simulate('click');
  //   act(() => {
  //     //set text input value and press button
  //     wrapper.find(TextInput).props().onChange!('asdlfkj', null!);
  //   });
  //   search.simulate('click');
  //   expect(props.setFilters).not.toHaveBeenCalled();
  //   expect(wrapper.find(TextInput).at(0).getElement().props['validated']).toBe(ValidatedOptions.error);
  // });
  // it('should filter with autocompletion fast selection', async () => {
  //   props.filters = [];
  //   const wrapper = mount(<FiltersToolbar {...props} />);
  //   jest.clearAllMocks();

  //   const dropdown = wrapper.find('#column-filter-toggle').at(0);
  //   //open dropdown and select Protocol
  //   dropdown.simulate('click');
  //   wrapper.find(`[id="${ColumnsId.proto}"]`).at(0).simulate('click');
  //   act(() => {
  //     //set text input value and press button
  //     wrapper.find(TextInput).props().onChange!('tcp', null!);
  //   });
  //   //press enter and await for popper to disapear
  //   await act(async () => {
  //     wrapper.find(TextInput).at(0).simulate('keypress', { key: 'Enter' });
  //   });
  //   const expected: Filter[] = [
  //     {
  //       def: findFilter('protocol')!,
  //       values: [{ v: '6', display: 'TCP' }]
  //     }
  //   ];
  //   expect(props.setFilters).toHaveBeenCalledWith(expected);
  //   expect(props.setFilters).toHaveBeenCalledTimes(1);
  // });
  // it('should show tips on complex fields', async () => {
  //   const wrapper = mount(<FiltersToolbar {...props} />);
  //   const dropdown = wrapper.find('#column-filter-toggle').at(0);

  //   //open dropdow and select Src workload
  //   dropdown.simulate('click');
  //   wrapper.find(`[id="${ColumnsId.srcowner}"]`).at(0).simulate('click');
  //   let tips = wrapper.find('#tips').at(0).getElement();
  //   expect(String(tips.props.children[0].props.children)).toContain('Specify a single kubernetes name');

  //   //open dropdow and select Src port
  //   dropdown.simulate('click');
  //   wrapper.find(`[id="${ColumnsId.srcport}"]`).at(0).simulate('click');
  //   tips = wrapper.find('#tips').at(0).getElement();
  //   expect(String(tips.props.children[0].props.children)).toContain('Specify a single port');

  //   //open dropdow and select Src address
  //   dropdown.simulate('click');
  //   wrapper.find(`[id="${ColumnsId.srcaddr}"]`).at(0).simulate('click');
  //   tips = wrapper.find('#tips').at(0).getElement();
  //   expect(String(tips.props.children[0].props.children)).toContain('Specify a single address');

  //   //open dropdow and select Protocol
  //   dropdown.simulate('click');
  //   wrapper.find(`[id="${ColumnsId.proto}"]`).at(0).simulate('click');
  //   tips = wrapper.find('#tips').at(0).getElement();
  //   expect(String(tips.props.children[0].props.children)).toContain('Specify a single protocol');
  // });
// });
