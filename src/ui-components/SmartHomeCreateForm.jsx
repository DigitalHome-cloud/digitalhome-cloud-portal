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
  Text,
  TextField,
  useTheme,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { createSmartHome } from "../graphql/mutations";
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
export default function SmartHomeCreateForm(props) {
  const {
    clearOnSuccess = true,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    owners: [],
    country: "",
    zip: "",
    streetCode: "",
    houseNumber: "",
    suffix: "",
    address: "",
    description: "",
    ownerName: "",
  };
  const [owners, setOwners] = React.useState(initialValues.owners);
  const [country, setCountry] = React.useState(initialValues.country);
  const [zip, setZip] = React.useState(initialValues.zip);
  const [streetCode, setStreetCode] = React.useState(initialValues.streetCode);
  const [houseNumber, setHouseNumber] = React.useState(
    initialValues.houseNumber
  );
  const [suffix, setSuffix] = React.useState(initialValues.suffix);
  const [address, setAddress] = React.useState(initialValues.address);
  const [description, setDescription] = React.useState(
    initialValues.description
  );
  const [ownerName, setOwnerName] = React.useState(initialValues.ownerName);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    setOwners(initialValues.owners);
    setCurrentOwnersValue("");
    setCountry(initialValues.country);
    setZip(initialValues.zip);
    setStreetCode(initialValues.streetCode);
    setHouseNumber(initialValues.houseNumber);
    setSuffix(initialValues.suffix);
    setAddress(initialValues.address);
    setDescription(initialValues.description);
    setOwnerName(initialValues.ownerName);
    setErrors({});
  };
  const [currentOwnersValue, setCurrentOwnersValue] = React.useState("");
  const ownersRef = React.createRef();
  const validations = {
    owners: [],
    country: [{ type: "Required" }],
    zip: [{ type: "Required" }],
    streetCode: [{ type: "Required" }],
    houseNumber: [{ type: "Required" }],
    suffix: [{ type: "Required" }],
    address: [],
    description: [],
    ownerName: [],
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
          owners,
          country,
          zip,
          streetCode,
          houseNumber,
          suffix,
          address,
          description,
          ownerName,
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
            query: createSmartHome.replaceAll("__typename", ""),
            variables: {
              input: {
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
          if (clearOnSuccess) {
            resetStateValues();
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "SmartHomeCreateForm")}
      {...rest}
    >
      <ArrayField
        onChange={async (items) => {
          let values = items;
          if (onChange) {
            const modelFields = {
              owners: values,
              country,
              zip,
              streetCode,
              houseNumber,
              suffix,
              address,
              description,
              ownerName,
            };
            const result = onChange(modelFields);
            values = result?.owners ?? values;
          }
          setOwners(values);
          setCurrentOwnersValue("");
        }}
        currentFieldValue={currentOwnersValue}
        label={"Owners"}
        items={owners}
        hasError={errors?.owners?.hasError}
        runValidationTasks={async () =>
          await runValidationTasks("owners", currentOwnersValue)
        }
        errorMessage={errors?.owners?.errorMessage}
        setFieldValue={setCurrentOwnersValue}
        inputFieldRef={ownersRef}
        defaultFieldValue={""}
      >
        <TextField
          label="Owners"
          isRequired={false}
          isReadOnly={false}
          value={currentOwnersValue}
          onChange={(e) => {
            let { value } = e.target;
            if (errors.owners?.hasError) {
              runValidationTasks("owners", value);
            }
            setCurrentOwnersValue(value);
          }}
          onBlur={() => runValidationTasks("owners", currentOwnersValue)}
          errorMessage={errors.owners?.errorMessage}
          hasError={errors.owners?.hasError}
          ref={ownersRef}
          labelHidden={true}
          {...getOverrideProps(overrides, "owners")}
        ></TextField>
      </ArrayField>
      <TextField
        label="Country"
        isRequired={true}
        isReadOnly={false}
        value={country}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owners,
              country: value,
              zip,
              streetCode,
              houseNumber,
              suffix,
              address,
              description,
              ownerName,
            };
            const result = onChange(modelFields);
            value = result?.country ?? value;
          }
          if (errors.country?.hasError) {
            runValidationTasks("country", value);
          }
          setCountry(value);
        }}
        onBlur={() => runValidationTasks("country", country)}
        errorMessage={errors.country?.errorMessage}
        hasError={errors.country?.hasError}
        {...getOverrideProps(overrides, "country")}
      ></TextField>
      <TextField
        label="Zip"
        isRequired={true}
        isReadOnly={false}
        value={zip}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owners,
              country,
              zip: value,
              streetCode,
              houseNumber,
              suffix,
              address,
              description,
              ownerName,
            };
            const result = onChange(modelFields);
            value = result?.zip ?? value;
          }
          if (errors.zip?.hasError) {
            runValidationTasks("zip", value);
          }
          setZip(value);
        }}
        onBlur={() => runValidationTasks("zip", zip)}
        errorMessage={errors.zip?.errorMessage}
        hasError={errors.zip?.hasError}
        {...getOverrideProps(overrides, "zip")}
      ></TextField>
      <TextField
        label="Street code"
        isRequired={true}
        isReadOnly={false}
        value={streetCode}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owners,
              country,
              zip,
              streetCode: value,
              houseNumber,
              suffix,
              address,
              description,
              ownerName,
            };
            const result = onChange(modelFields);
            value = result?.streetCode ?? value;
          }
          if (errors.streetCode?.hasError) {
            runValidationTasks("streetCode", value);
          }
          setStreetCode(value);
        }}
        onBlur={() => runValidationTasks("streetCode", streetCode)}
        errorMessage={errors.streetCode?.errorMessage}
        hasError={errors.streetCode?.hasError}
        {...getOverrideProps(overrides, "streetCode")}
      ></TextField>
      <TextField
        label="House number"
        isRequired={true}
        isReadOnly={false}
        value={houseNumber}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owners,
              country,
              zip,
              streetCode,
              houseNumber: value,
              suffix,
              address,
              description,
              ownerName,
            };
            const result = onChange(modelFields);
            value = result?.houseNumber ?? value;
          }
          if (errors.houseNumber?.hasError) {
            runValidationTasks("houseNumber", value);
          }
          setHouseNumber(value);
        }}
        onBlur={() => runValidationTasks("houseNumber", houseNumber)}
        errorMessage={errors.houseNumber?.errorMessage}
        hasError={errors.houseNumber?.hasError}
        {...getOverrideProps(overrides, "houseNumber")}
      ></TextField>
      <TextField
        label="Suffix"
        isRequired={true}
        isReadOnly={false}
        value={suffix}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owners,
              country,
              zip,
              streetCode,
              houseNumber,
              suffix: value,
              address,
              description,
              ownerName,
            };
            const result = onChange(modelFields);
            value = result?.suffix ?? value;
          }
          if (errors.suffix?.hasError) {
            runValidationTasks("suffix", value);
          }
          setSuffix(value);
        }}
        onBlur={() => runValidationTasks("suffix", suffix)}
        errorMessage={errors.suffix?.errorMessage}
        hasError={errors.suffix?.hasError}
        {...getOverrideProps(overrides, "suffix")}
      ></TextField>
      <TextField
        label="Address"
        isRequired={false}
        isReadOnly={false}
        value={address}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owners,
              country,
              zip,
              streetCode,
              houseNumber,
              suffix,
              address: value,
              description,
              ownerName,
            };
            const result = onChange(modelFields);
            value = result?.address ?? value;
          }
          if (errors.address?.hasError) {
            runValidationTasks("address", value);
          }
          setAddress(value);
        }}
        onBlur={() => runValidationTasks("address", address)}
        errorMessage={errors.address?.errorMessage}
        hasError={errors.address?.hasError}
        {...getOverrideProps(overrides, "address")}
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
              owners,
              country,
              zip,
              streetCode,
              houseNumber,
              suffix,
              address,
              description: value,
              ownerName,
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
      <TextField
        label="Owner name"
        isRequired={false}
        isReadOnly={false}
        value={ownerName}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owners,
              country,
              zip,
              streetCode,
              houseNumber,
              suffix,
              address,
              description,
              ownerName: value,
            };
            const result = onChange(modelFields);
            value = result?.ownerName ?? value;
          }
          if (errors.ownerName?.hasError) {
            runValidationTasks("ownerName", value);
          }
          setOwnerName(value);
        }}
        onBlur={() => runValidationTasks("ownerName", ownerName)}
        errorMessage={errors.ownerName?.errorMessage}
        hasError={errors.ownerName?.hasError}
        {...getOverrideProps(overrides, "ownerName")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Clear"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          {...getOverrideProps(overrides, "ClearButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={Object.values(errors).some((e) => e?.hasError)}
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
