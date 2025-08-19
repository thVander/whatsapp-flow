/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// this object is generated from Flow Builder under "..." > Endpoint > Snippets > Responses
const SCREEN_RESPONSES = {
  APPOINTMENT: {
    screen: "APPOINTMENT",
    data: {
      department: [
        {
          id: "01",
          title: "Teste 1",
        },
        {
          id: "02",
          title: "teste 2",
        },
        {
          id: "03",
          title: "teste 3",
        },
        {
          id: "04",
          title: "teste 4",
        },
        {
          id: "05",
          title: "teste 5",
        },
      ],
      location: [
        {
          id: "1",
          title: "teste1",
        },
        {
          id: "2",
          title: "Teste 2",
        },
        {
          id: "3",
          title: "CTeste 3",
        },
        {
          id: "4",
          title: "Teste 4",
        },
      ],
      is_location_enabled: true,
      name: "John Doe",
      name: "John Doe",
      name: "John Doe",
      name: "John Doe"
    },
  },
  SUMMARY: {
    screen: "SUMMARY",
    data: {
      appointment:
        "Beauty & Personal Care Department at Kings Cross, London\nMon Jan 01 2024 at 11:30.",
      details:
        "Name: John Doe\nEmail: john@example.com\nPhone: 123456789\n\nA free skin care consultation, please",
      department: "beauty",
      location: "1",
      date: "2024-01-01",
      time: "11:30",
      name: "John Doe",
      email: "john@example.com",
      phone: "123456789",
      more_details: "A free skin care consultation, please",
    },
  },
  SUCCESS: {
    screen: "SUCCESS",
    data: {
      extension_message_response: {
        params: {
          flow_token: "REPLACE_FLOW_TOKEN",
          some_param_name: "PASS_CUSTOM_VALUE",
        },
      },
    },
  },
};

export const getNextScreen = async (decryptedBody) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  // handle health check request
  if (action === "ping") {
    return {
      data: {
        status: "active",
      },
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      data: {
        acknowledged: true,
      },
    };
  }

  // handle initial request when opening the flow and display APPOINTMENT screen
  if (action === "INIT") {
    return {
      ...SCREEN_RESPONSES.APPOINTMENT,
      data: {
        ...SCREEN_RESPONSES.APPOINTMENT.data,
        // these fields are disabled initially. Each field is enabled when previous fields are selected
        is_location_enabled: false,
        is_date_enabled: false,
        is_time_enabled: false,
      },
    };
  }

  if (action === "data_exchange") {
    // handle the request based on the current screen
    switch (screen) {
      // handles when user interacts with APPOINTMENT screen
      case "APPOINTMENT":
        // update the appointment fields based on current user selection
        return {
          ...SCREEN_RESPONSES.APPOINTMENT,
          data: {
            // copy initial screen data then override specific fields
            ...SCREEN_RESPONSES.APPOINTMENT.data,
            // each field is enabled only when previous fields are selected
            is_location_enabled: Boolean(data.department),
            is_date_enabled: Boolean(data.department) && Boolean(data.location),
            is_time_enabled:
              Boolean(data.department) &&
              Boolean(data.location) &&
              Boolean(data.date),

            //TODO: filter each field options based on current selection, here we filter randomly instead
            location: SCREEN_RESPONSES.APPOINTMENT.data.location.slice(0, 3),
            date: SCREEN_RESPONSES.APPOINTMENT.data.date.slice(0, 3),
            time: SCREEN_RESPONSES.APPOINTMENT.data.time.slice(0, 3),
          },
        };

      // handles when user completes SUMMARY screen
      case "SUMMARY":
        // TODO: save appointment to your database
        // send success response to complete and close the flow
        return {
          ...SCREEN_RESPONSES.SUCCESS,
          data: {
            extension_message_response: {
              params: {
                flow_token                
              },
            },
          },
        };

      default:
        break;
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
};
