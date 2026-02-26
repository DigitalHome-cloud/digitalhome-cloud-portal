/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  Badge,
  Button,
  Divider,
  Flex,
  Grid,
  Icon,
  ScrollView,
  SwitchField,
  Text,
  TextField,
  useTheme,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { getLibraryItem } from "../graphql/queries";
import { updateLibraryItem } from "../graphql/mutations";
const client = generateClient();
function ArrayField({
  items = [],
  onChange,
  label,
  inputFieldRef,
  children,
  hasError,
  setFieldValue,
  currentFieldValue,
  defaultFieldValue,
  lengthLimit,
  getBadgeText,
  runValidationTasks,
  errorMessage,
}) {
  const labelElement = <Text>{label}</Text>;
  const {
    tokens: {
      components: {
        fieldmessages: { error: errorStyles },
      },
    },
  } = useTheme();
  const [selectedBadgeIndex, setSelectedBadgeIndex] = React.useState();
  const [isEditing, setIsEditing] = React.useState();
  React.useEffect(() => {
    if (isEditing) {
      inputFieldRef?.current?.focus();
    }
  }, [isEditing]);
  const removeItem = async (removeIndex) => {
    const newItems = items.filter((value, index) => index !== removeIndex);
    await onChange(newItems);
    setSelectedBadgeIndex(undefined);
  };
  const addItem = async () => {
    const { hasError } = runValidationTasks();
    if (
      currentFieldValue !== undefined &&
      currentFieldValue !== null &&
      currentFieldValue !== "" &&
      !hasError
    ) {
      const newItems = [...items];
      if (selectedBadgeIndex !== undefined) {
        newItems[selectedBadgeIndex] = currentFieldValue;
        setSelectedBadgeIndex(undefined);
      } else {
        newItems.push(currentFieldValue);
      }
      await onChange(newItems);
      setIsEditing(false);
    }
  };
  const arraySection = (
    <React.Fragment>
      {!!items?.length && (
        <ScrollView height="inherit" width="inherit" maxHeight={"7rem"}>
          {items.map((value, index) => {
            return (
              <Badge
                key={index}
                style={{
                  cursor: "pointer",
                  alignItems: "center",
                  marginRight: 3,
                  marginTop: 3,
                  backgroundColor:
                    index === selectedBadgeIndex ? "#B8CEF9" : "",
                }}
                onClick={() => {
                  setSelectedBadgeIndex(index);
                  setFieldValue(items[index]);
                  setIsEditing(true);
                }}
              >
                {getBadgeText ? getBadgeText(value) : value.toString()}
                <Icon
                  style={{
                    cursor: "pointer",
                    paddingLeft: 3,
                    width: 20,
                    height: 20,
                  }}
                  viewBox={{ width: 20, height: 20 }}
                  paths={[
                    {
                      d: "M10 10l5.09-5.09L10 10l5.09 5.09L10 10zm0 0L4.91 4.91 10 10l-5.09 5.09L10 10z",
                      stroke: "black",
                    },
                  ]}
                  ariaLabel="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeItem(index);
                  }}
                />
              </Badge>
            );
          })}
        </ScrollView>
      )}
      <Divider orientation="horizontal" marginTop={5} />
    </React.Fragment>
  );
  if (lengthLimit !== undefined && items.length >= lengthLimit && !isEditing) {
    return (
      <React.Fragment>
        {labelElement}
        {arraySection}
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      {labelElement}
      {isEditing && children}
      {!isEditing ? (
        <>
          <Button
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Add item
          </Button>
          {errorMessage && hasError && (
            <Text color={errorStyles.color} fontSize={errorStyles.fontSize}>
              {errorMessage}
            </Text>
          )}
        </>
      ) : (
        <Flex justifyContent="flex-end">
          {(currentFieldValue || isEditing) && (
            <Button
              children="Cancel"
              type="button"
              size="small"
              onClick={() => {
                setFieldValue(defaultFieldValue);
                setIsEditing(false);
                setSelectedBadgeIndex(undefined);
              }}
            ></Button>
          )}
          <Button size="small" variation="link" onClick={addItem}>
            {selectedBadgeIndex !== undefined ? "Save" : "Add"}
          </Button>
        </Flex>
      )}
      {arraySection}
    </React.Fragment>
  );
}
export default function LibraryItemUpdateForm(props) {
  const {
    id: idProp,
    libraryItem: libraryItemModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    title: "",
    compatibleClasses: [],
    region: "",
    standards: [],
    version: "",
    description: "",
    hasActorCapability: false,
    hasSensorCapability: false,
    hasControllerCapability: false,
  };
  const [title, setTitle] = React.useState(initialValues.title);
  const [compatibleClasses, setCompatibleClasses] = React.useState(
    initialValues.compatibleClasses
  );
  const [region, setRegion] = React.useState(initialValues.region);
  const [standards, setStandards] = React.useState(initialValues.standards);
  const [version, setVersion] = React.useState(initialValues.version);
  const [description, setDescription] = React.useState(
    initialValues.description
  );
  const [hasActorCapability, setHasActorCapability] = React.useState(
    initialValues.hasActorCapability
  );
  const [hasSensorCapability, setHasSensorCapability] = React.useState(
    initialValues.hasSensorCapability
  );
  const [hasControllerCapability, setHasControllerCapability] = React.useState(
    initialValues.hasControllerCapability
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = libraryItemRecord
      ? { ...initialValues, ...libraryItemRecord }
      : initialValues;
    setTitle(cleanValues.title);
    setCompatibleClasses(cleanValues.compatibleClasses ?? []);
    setCurrentCompatibleClassesValue("");
    setRegion(cleanValues.region);
    setStandards(cleanValues.standards ?? []);
    setCurrentStandardsValue("");
    setVersion(cleanValues.version);
    setDescription(cleanValues.description);
    setHasActorCapability(cleanValues.hasActorCapability);
    setHasSensorCapability(cleanValues.hasSensorCapability);
    setHasControllerCapability(cleanValues.hasControllerCapability);
    setErrors({});
  };
  const [libraryItemRecord, setLibraryItemRecord] =
    React.useState(libraryItemModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await client.graphql({
              query: getLibraryItem.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getLibraryItem
        : libraryItemModelProp;
      setLibraryItemRecord(record);
    };
    queryData();
  }, [idProp, libraryItemModelProp]);
  React.useEffect(resetStateValues, [libraryItemRecord]);
  const [currentCompatibleClassesValue, setCurrentCompatibleClassesValue] =
    React.useState("");
  const compatibleClassesRef = React.createRef();
  const [currentStandardsValue, setCurrentStandardsValue] = React.useState("");
  const standardsRef = React.createRef();
  const validations = {
    title: [{ type: "Required" }],
    compatibleClasses: [{ type: "Required" }],
    region: [],
    standards: [],
    version: [{ type: "Required" }],
    description: [],
    hasActorCapability: [],
    hasSensorCapability: [],
    hasControllerCapability: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          title,
          compatibleClasses,
          region: region ?? null,
          standards: standards ?? null,
          version,
          description: description ?? null,
          hasActorCapability: hasActorCapability ?? null,
          hasSensorCapability: hasSensorCapability ?? null,
          hasControllerCapability: hasControllerCapability ?? null,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await client.graphql({
            query: updateLibraryItem.replaceAll("__typename", ""),
            variables: {
              input: {
                id: libraryItemRecord.id,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "LibraryItemUpdateForm")}
      {...rest}
    >
      <TextField
        label="Title"
        isRequired={true}
        isReadOnly={false}
        value={title}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              title: value,
              compatibleClasses,
              region,
              standards,
              version,
              description,
              hasActorCapability,
              hasSensorCapability,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            value = result?.title ?? value;
          }
          if (errors.title?.hasError) {
            runValidationTasks("title", value);
          }
          setTitle(value);
        }}
        onBlur={() => runValidationTasks("title", title)}
        errorMessage={errors.title?.errorMessage}
        hasError={errors.title?.hasError}
        {...getOverrideProps(overrides, "title")}
      ></TextField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses: values,
              region,
              standards,
              version,
              description,
              hasActorCapability,
              hasSensorCapability,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            values = result?.compatibleClasses ?? values;
          }
          setCompatibleClasses(values);
          setCurrentCompatibleClassesValue("");
        }}
        currentFieldValue={currentCompatibleClassesValue}
        label={"Compatible classes"}
        items={compatibleClasses}
        hasError={errors?.compatibleClasses?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks(
            "compatibleClasses",
            currentCompatibleClassesValue
          )
        }
        errorMessage={errors?.compatibleClasses?.errorMessage}
        setFieldValue={setCurrentCompatibleClassesValue}
        inputFieldRef={compatibleClassesRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Compatible classes"
          isRequired={true}
          isReadOnly={false}
          value={currentCompatibleClassesValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.compatibleClasses?.hasError) {
              runValidationTasks("compatibleClasses", value);
            }
            setCurrentCompatibleClassesValue(value);
          }}
          onBlur={() =>
            runValidationTasks(
              "compatibleClasses",
              currentCompatibleClassesValue
            )
          }
          errorMessage={errors.compatibleClasses?.errorMessage}
          hasError={errors.compatibleClasses?.hasError}
          ref={compatibleClassesRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "compatibleClasses")}
        ></TextField>
      </ArrayField>
      <TextField
        label="Region"
        isRequired={false}
        isReadOnly={false}
        value={region}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses,
              region: value,
              standards,
              version,
              description,
              hasActorCapability,
              hasSensorCapability,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            value = result?.region ?? value;
          }
          if (errors.region?.hasError) {
            runValidationTasks("region", value);
          }
          setRegion(value);
        }}
        onBlur={() => runValidationTasks("region", region)}
        errorMessage={errors.region?.errorMessage}
        hasError={errors.region?.hasError}
        {...getOverrideProps(overrides, "region")}
      ></TextField>
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses,
              region,
              standards: values,
              version,
              description,
              hasActorCapability,
              hasSensorCapability,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            values = result?.standards ?? values;
          }
          setStandards(values);
          setCurrentStandardsValue("");
        }}
        currentFieldValue={currentStandardsValue}
        label={"Standards"}
        items={standards}
        hasError={errors?.standards?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks("standards", currentStandardsValue)
        }
        errorMessage={errors?.standards?.errorMessage}
        setFieldValue={setCurrentStandardsValue}
        inputFieldRef={standardsRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Standards"
          isRequired={false}
          isReadOnly={false}
          value={currentStandardsValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.standards?.hasError) {
              runValidationTasks("standards", value);
            }
            setCurrentStandardsValue(value);
          }}
          onBlur={() => runValidationTasks("standards", currentStandardsValue)}
          errorMessage={errors.standards?.errorMessage}
          hasError={errors.standards?.hasError}
          ref={standardsRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "standards")}
        ></TextField>
      </ArrayField>
      <TextField
        label="Version"
        isRequired={true}
        isReadOnly={false}
        value={version}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses,
              region,
              standards,
              version: value,
              description,
              hasActorCapability,
              hasSensorCapability,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            value = result?.version ?? value;
          }
          if (errors.version?.hasError) {
            runValidationTasks("version", value);
          }
          setVersion(value);
        }}
        onBlur={() => runValidationTasks("version", version)}
        errorMessage={errors.version?.errorMessage}
        hasError={errors.version?.hasError}
        {...getOverrideProps(overrides, "version")}
      ></TextField>
      <TextField
        label="Description"
        isRequired={false}
        isReadOnly={false}
        value={description}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses,
              region,
              standards,
              version,
              description: value,
              hasActorCapability,
              hasSensorCapability,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            value = result?.description ?? value;
          }
          if (errors.description?.hasError) {
            runValidationTasks("description", value);
          }
          setDescription(value);
        }}
        onBlur={() => runValidationTasks("description", description)}
        errorMessage={errors.description?.errorMessage}
        hasError={errors.description?.hasError}
        {...getOverrideProps(overrides, "description")}
      ></TextField>
      <SwitchField
        label="Has actor capability"
        defaultChecked={false}
        isDisabled={false}
        isChecked={hasActorCapability}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses,
              region,
              standards,
              version,
              description,
              hasActorCapability: value,
              hasSensorCapability,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            value = result?.hasActorCapability ?? value;
          }
          if (errors.hasActorCapability?.hasError) {
            runValidationTasks("hasActorCapability", value);
          }
          setHasActorCapability(value);
        }}
        onBlur={() =>
          runValidationTasks("hasActorCapability", hasActorCapability)
        }
        errorMessage={errors.hasActorCapability?.errorMessage}
        hasError={errors.hasActorCapability?.hasError}
        {...getOverrideProps(overrides, "hasActorCapability")}
      ></SwitchField>
      <SwitchField
        label="Has sensor capability"
        defaultChecked={false}
        isDisabled={false}
        isChecked={hasSensorCapability}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses,
              region,
              standards,
              version,
              description,
              hasActorCapability,
              hasSensorCapability: value,
              hasControllerCapability,
            };
            const result = onChange(modelFields);
            value = result?.hasSensorCapability ?? value;
          }
          if (errors.hasSensorCapability?.hasError) {
            runValidationTasks("hasSensorCapability", value);
          }
          setHasSensorCapability(value);
        }}
        onBlur={() =>
          runValidationTasks("hasSensorCapability", hasSensorCapability)
        }
        errorMessage={errors.hasSensorCapability?.errorMessage}
        hasError={errors.hasSensorCapability?.hasError}
        {...getOverrideProps(overrides, "hasSensorCapability")}
      ></SwitchField>
      <SwitchField
        label="Has controller capability"
        defaultChecked={false}
        isDisabled={false}
        isChecked={hasControllerCapability}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              title,
              compatibleClasses,
              region,
              standards,
              version,
              description,
              hasActorCapability,
              hasSensorCapability,
              hasControllerCapability: value,
            };
            const result = onChange(modelFields);
            value = result?.hasControllerCapability ?? value;
          }
          if (errors.hasControllerCapability?.hasError) {
            runValidationTasks("hasControllerCapability", value);
          }
          setHasControllerCapability(value);
        }}
        onBlur={() =>
          runValidationTasks("hasControllerCapability", hasControllerCapability)
        }
        errorMessage={errors.hasControllerCapability?.errorMessage}
        hasError={errors.hasControllerCapability?.hasError}
        {...getOverrideProps(overrides, "hasControllerCapability")}
      ></SwitchField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || libraryItemModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || libraryItemModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
