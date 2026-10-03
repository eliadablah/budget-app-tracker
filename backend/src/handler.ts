// src/handler.ts
// What: the single entry point AWS Lambda calls on every request. Reads the
// incoming API Gateway event and routes it to the right function - this
// file stays thin on purpose; the real logic lives in src/todos/*,
// src/bills/*, src/budget/*, src/settings/* and src/bank/*.

import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { connectBank } from "./bank/connectBank";
import { createLinkToken } from "./bank/createLinkToken";
import { listBankAccounts } from "./bank/listBankAccounts";
import { listBankTransactions } from "./bank/listBankTransactions";
import { removeBank } from "./bank/removeBank";
import { validateBankId, validateInstitutionName, validatePublicToken } from "./bank/validateBank";
import { listBills } from "./bills/billStore";
import { createBill } from "./bills/createBill";
import { deleteBill } from "./bills/deleteBill";
import { dismissSuggestion } from "./bills/dismissSuggestion";
import { recordBillPayment } from "./bills/recordBillPayment";
import { updateBill } from "./bills/updateBill";
import {
  validateBillId,
  validateBillInput,
  validateOptionalTransactionId,
  validatePaymentAmount,
  validateTransactionId,
} from "./bills/validateBill";
import { getBudget, saveBudgetLimits } from "./budget/budgetStore";
import { validateBudgetLimits } from "./budget/validateBudget";
import { EmailNotConfiguredError } from "./lib/email";
import { HttpError, json, noContent, parseJsonBody } from "./lib/http";
import { PlaidError } from "./lib/plaid";
import { getNotificationSettings } from "./settings/notificationSettingsStore";
import { sendTestEmail } from "./settings/sendTestEmail";
import { updateNotificationSettings } from "./settings/updateNotificationSettings";
import { validateSettingsChanges } from "./settings/validateSettings";
import { clearTodoReminder } from "./todos/clearTodoReminder";
import { createTodo } from "./todos/createTodo";
import { deleteTodo } from "./todos/deleteTodo";
import { listTodos } from "./todos/listTodos";
import { setTodoReminder } from "./todos/setTodoReminder";
import { updateTodo } from "./todos/updateTodo";
import { validateOptionalReminder, validateReminder } from "./todos/validateReminder";
import { validateDone, validateTitle, validateTodoId } from "./todos/validateTodo";

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  try {
    // API Gateway's JWT authorizer already verified the login token before
    // this code ever runs - a request only gets here if it's genuinely
    // authenticated. "sub" is the token's permanent, unique ID for whoever
    // logged in, replacing the old hardcoded "me" placeholder.
    const userId = event.requestContext.authorizer.jwt.claims.sub as string;

    // routeKey is the exact route API Gateway matched (see apigateway.tf),
    // e.g. "PATCH /todos/{id}" - so each case below lines up one-to-one with
    // a route declared in Terraform.
    switch (event.routeKey) {
      case "GET /todos": {
        return json(200, await listTodos(userId));
      }

      case "POST /todos": {
        const body = parseJsonBody(event.body);
        return json(
          201,
          await createTodo(userId, validateTitle(body.title), validateOptionalReminder(body))
        );
      }

      case "PATCH /todos/{id}": {
        const sk = validateTodoId(event.pathParameters?.id);
        const body = parseJsonBody(event.body);
        return json(200, await updateTodo(userId, sk, validateDone(body.done)));
      }

      case "DELETE /todos/{id}": {
        const sk = validateTodoId(event.pathParameters?.id);
        await deleteTodo(userId, sk);
        return noContent();
      }

      case "PUT /todos/{id}/reminder": {
        const sk = validateTodoId(event.pathParameters?.id);
        const body = parseJsonBody(event.body);
        return json(200, await setTodoReminder(userId, sk, validateReminder(body)));
      }

      case "DELETE /todos/{id}/reminder": {
        const sk = validateTodoId(event.pathParameters?.id);
        return json(200, await clearTodoReminder(userId, sk));
      }

      case "GET /settings/notifications": {
        return json(200, await getNotificationSettings(userId));
      }

      case "PATCH /settings/notifications": {
        const body = parseJsonBody(event.body);
        return json(200, await updateNotificationSettings(userId, validateSettingsChanges(body)));
      }

      case "POST /settings/notifications/test": {
        await sendTestEmail(userId);
        return noContent();
      }

      case "GET /bills": {
        return json(200, await listBills(userId));
      }

      case "POST /bills": {
        const body = parseJsonBody(event.body);
        return json(201, await createBill(userId, validateBillInput(body)));
      }

      case "PATCH /bills/{id}": {
        const sk = validateBillId(event.pathParameters?.id);
        const body = parseJsonBody(event.body);
        return json(200, await updateBill(userId, sk, validateBillInput(body)));
      }

      case "DELETE /bills/{id}": {
        const sk = validateBillId(event.pathParameters?.id);
        await deleteBill(userId, sk);
        return noContent();
      }

      case "POST /bills/{id}/payments": {
        const sk = validateBillId(event.pathParameters?.id);
        const body = parseJsonBody(event.body);
        return json(
          201,
          await recordBillPayment(
            userId,
            sk,
            validatePaymentAmount(body.amount),
            validateOptionalTransactionId(body.transactionId)
          )
        );
      }

      case "POST /bills/suggestions/dismiss": {
        const body = parseJsonBody(event.body);
        await dismissSuggestion(userId, validateTransactionId(body.transactionId));
        return noContent();
      }

      case "GET /budget": {
        return json(200, await getBudget(userId));
      }

      case "PUT /budget": {
        const body = parseJsonBody(event.body);
        return json(200, await saveBudgetLimits(userId, validateBudgetLimits(body.limits)));
      }

      case "POST /bank/link-token": {
        return json(200, await createLinkToken(userId));
      }

      case "POST /bank/connections": {
        const body = parseJsonBody(event.body);
        const connection = await connectBank(
          userId,
          validatePublicToken(body.publicToken),
          validateInstitutionName(body.institutionName)
        );
        return json(201, { id: connection.sk, institutionName: connection.institutionName });
      }

      case "GET /bank/accounts": {
        return json(200, await listBankAccounts(userId));
      }

      case "GET /bank/transactions": {
        return json(200, await listBankTransactions(userId));
      }

      case "DELETE /bank/connections/{id}": {
        const sk = validateBankId(event.pathParameters?.id);
        await removeBank(userId, sk);
        return noContent();
      }

      default:
        return json(404, { message: "Not found" });
    }
  } catch (err) {
    // Plaid refused the request. 502 = "the service behind me failed"; the
    // details go to the logs, not to the caller.
    if (err instanceof PlaidError) {
      console.error(`Plaid error ${err.errorCode}:`, err.message);
      return json(502, { message: "The bank service couldn't complete that request" });
    }

    // An HttpError is a deliberate "the request was wrong" - its message was
    // written to be shown to the caller.
    if (err instanceof HttpError) {
      return json(err.statusCode, { message: err.message });
    }

    // Email isn't set up in Terraform. 503 = "temporarily unavailable" - a
    // clear message instead of a confusing 500.
    if (err instanceof EmailNotConfiguredError) {
      return json(503, { message: "Email reminders aren't set up yet" });
    }

    // Anything else: log details for yourself in CloudWatch, but never leak
    // internals (stack traces, AWS error details) back to whoever called.
    console.error("Unhandled error:", err);
    return json(500, { message: "Internal server error" });
  }
}
