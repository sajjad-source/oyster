import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '../shared/constants';
import { job } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const SyncAirmeetEventFormData = z.object({
  eventId: z.string().uuid('The ID must be a valid UUID.'),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    SyncAirmeetEventFormData,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  job('event.sync', {
    eventId: data.eventId,
  });

  toast(session, {
    message: 'Event is being synced. Check back soon.',
    type: 'success',
  });

  return redirect(Route.EVENTS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function SyncAirmeetEventPage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(Route.EVENTS);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Sync Airmeet Event</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <SyncAirmeetEventForm />
    </Modal>
  );
}

const keys = SyncAirmeetEventFormData.keyof().enum;

function SyncAirmeetEventForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const submitting = useNavigation().state === 'submitting';

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        description="You can find the ID from the Airmeet event URL."
        error={errors.eventId}
        label="Airmeet ID"
        labelFor={keys.eventId}
        required
      >
        <Input id={keys.eventId} name={keys.eventId} required />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Sync
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
