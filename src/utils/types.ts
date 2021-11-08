import type { GetPageResponse } from '@notionhq/client/build/src/api-endpoints';

/** Property **/
export type Page = GetPageResponse;
export type PropertyValueMap = Page['properties'];
export type PropertyValue = PropertyValueMap[string];

export type PropertyValueType = PropertyValue['type'];

export type ExtractedPropertyValue<TType extends PropertyValueType> = Extract<PropertyValue, { type: TType }>;

export type TitlePropertyValue = ExtractedPropertyValue<'title'>;
export type RichTextPropertyValue = ExtractedPropertyValue<'rich_text'>;
export type NumberPropertyValue = ExtractedPropertyValue<'number'>;
export type UrlPropertyValue = ExtractedPropertyValue<'url'>;
export type SelectPropertyValue = ExtractedPropertyValue<'select'>;
export type MultiSelectPropertyValue = ExtractedPropertyValue<'multi_select'>;
export type PeoplePropertyValue = ExtractedPropertyValue<'people'>;
export type EmailPropertyValue = ExtractedPropertyValue<'email'>;
export type PhoneNumberPropertyValue = ExtractedPropertyValue<'phone_number'>;
export type DatePropertyValue = ExtractedPropertyValue<'date'>;
export type FilesPropertyValue = ExtractedPropertyValue<'files'>;
export type FormulaPropertyValue = ExtractedPropertyValue<'formula'>;
export type RelationPropertyValue = ExtractedPropertyValue<'relation'>;
export type RollupPropertyValue = ExtractedPropertyValue<'rollup'>;
export type CreatedTimePropertyValue = ExtractedPropertyValue<'created_time'>;
export type CreatedByPropertyValue = ExtractedPropertyValue<'created_by'>;
export type EditedTimePropertyValue = ExtractedPropertyValue<'last_edited_time'>;
export type EditedByPropertyValue = ExtractedPropertyValue<'last_edited_by'>;
