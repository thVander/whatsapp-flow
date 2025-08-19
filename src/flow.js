/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Respostas somente para a tela APPOINTMENT + SUCCESS
const SCREEN_RESPONSES = {
  APPOINTMENT: {
    screen: "APPOINTMENT",
    data: {
      department: [
        { id: "01", title: "Teste 1" },
        { id: "02", title: "teste 2" },
        { id: "03", title: "teste 3" },
        { id: "04", title: "teste 4" },
        { id: "05", title: "teste 5" }
      ],
      location: [
        { id: "1", title: "teste1" },
        { id: "2", title: "Teste 2" },
        { id: "3", title: "CTeste 3" },
        { id: "4", title: "Teste 4" }
      ],
      is_location_enabled: true,  // será sobrescrito no INIT
      date: [
        { id: "2024-01-01", title: "Mon Jan 01 2024" },
        { id: "2024-01-02", title: "Tue Jan 02 2024" },
        { id: "2024-01-03", title: "Wed Jan 03 2024" }
      ],
      is_date_enabled: true,      // será sobrescrito no INIT
      time: [
        { id: "10:30", title: "10:30" },
        { id: "11:00", title: "11:00", enabled: false },
        { id: "11:30", title: "11:30" },
        { id: "12:00", title: "12:00", enabled: false },
        { id: "12:30", title: "12:30" }
      ],
      is_time_enabled: true       // será sobrescrito no INIT
    }
  },
  SUCCESS: {
    screen: "SUCCESS",
    data: {
      extension_message_response: {
        params: {
          flow_token: "REPLACE_FLOW_TOKEN"
        }
      }
    }
  }
};

export const getNextScreen = async (decryptedBody) => {
  const { screen, data, action, flow_token } = decryptedBody;

  // health check
  if (action === "ping") {
    return { data: { status: "active" } };
  }

  // notificação de erro do cliente
  if (data?.error) {
    console.warn("Received client error:", data);
    return { data: { acknowledged: true } };
  }

  // abertura do flow: mostra APPOINTMENT com campos bloqueados até seleção
  if (action === "INIT") {
    return {
      ...SCREEN_RESPONSES.APPOINTMENT,
      data: {
        ...SCREEN_RESPONSES.APPOINTMENT.data,
        is_location_enabled: false,
        is_date_enabled: false,
        is_time_enabled: false
      }
    };
  }

  // único fluxo de interação: APPOINTMENT
  if (action === "data_exchange" && screen === "APPOINTMENT") {
    const hasDept = Boolean(data.department);
    const hasLoc  = Boolean(data.location);
    const hasDate = Boolean(data.date);
    const hasTime = Boolean(data.time);

    // Se todos os campos estão preenchidos, finaliza o flow
    if (hasDept && hasLoc && hasDate && hasTime) {
      // aqui você pode salvar no seu banco antes de responder SUCCESS
      // console.log("Saving appointment:", data);

      return {
        ...SCREEN_RESPONSES.SUCCESS,
        data: {
          extension_message_response: {
            params: {
              flow_token,
              // opcional: ecoa o payload selecionado para uso no seu backend
              department: data.department,
              location: data.location,
              date: data.date,
              time: data.time
            }
          }
        }
      };
    }

    // Caso contrário, mantém na mesma tela e habilita os campos progressivamente
    return {
      ...SCREEN_RESPONSES.APPOINTMENT,
      data: {
        ...SCREEN_RESPONSES.APPOINTMENT.data,

        // habilitação progressiva
        is_location_enabled: hasDept,
        is_date_enabled: hasDept && hasLoc,
        is_time_enabled: hasDept && hasLoc && hasDate,

        // (opcional) "filtra" listas enquanto o usuário seleciona — aqui apenas exemplificamos
        location: SCREEN_RESPONSES.APPOINTMENT.data.location.slice(0, 4),
        date: SCREEN_RESPONSES.APPOINTMENT.data.date.slice(0, 3),
        time: SCREEN_RESPONSES.APPOINTMENT.data.time.slice(0, 5)
      }
    };
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
};
