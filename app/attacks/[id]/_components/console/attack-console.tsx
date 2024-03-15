import React from "react";
import { Spinner, VStack } from "@chakra-ui/react";

import { BodyStrongSmallText, H3Text } from "@/app/_components/typography";
import { AttackStep, AttackStepKey } from "../attack-overview-stepper";
import { Attack, STATUS_POOLING_INTERVAL } from "@/app/_attacks/attacks";
import { ATTACK_USERNAME_LOCAL_STORAGE_KEY } from "@/app/page";

export type AttackStatus =
  | "create_started"
  | "create_complete"
  | "destroy_started"
  | "destroy_complete"
  | "attack_started"
  | "attack_complete";

interface AttackConsoleProps {
  attack: Attack;
  step: AttackStep;
  logs: string[];
  setStep: (step: AttackStep) => void;
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  onChangeStatus: (status: AttackStatus) => void;
  onChangeStep: (step: number) => void;
}

export interface ApiResponse {
  response: {
    exchange: Array<string | object>;
    id: string;
    logs: Array<string>;
    status: AttackStatus;
    step: number;
  };
}

const AttackConsole = ({ attack, logs, step, setLogs, setStep, onChangeStatus, onChangeStep }: AttackConsoleProps) => {
  const username = window.localStorage ? localStorage.getItem(ATTACK_USERNAME_LOCAL_STORAGE_KEY)! : "";

  const [activeInterval, setActiveInterval] = React.useState<NodeJS.Timeout | null>(null);
  const [areLogsActive, setAreLogsActive] = React.useState(false);

  React.useEffect(() => {
    if (step.key === AttackStepKey.Create) {
      setLogs([]);
    }

    if (step.isActive && step.key !== AttackStepKey.Destroy) {
      return setAreLogsActive(true);
    }

    setAreLogsActive(false);
  }, [step]);

  React.useEffect(() => {
    if (!areLogsActive && activeInterval) {
      clearInterval(activeInterval);
      setActiveInterval(null);
    }

    if (areLogsActive) {
      const newInterval = setInterval(() => {
        fetch(`http://localhost:3000/api/${attack.statusEndpoint}/${username}`)
          .then((response) => response.json())
          .then((data: ApiResponse) => {
            const response = data.response;
            onChangeStep(response.step);
            onChangeStatus(response.status);

            if (response.status === "create_complete") {
              setStep({
                key: AttackStepKey.Attack,
                isActive: false,
              });
            }

            if (response.status === "attack_complete") {
              setStep({
                key: AttackStepKey.Destroy,
                isActive: false,
              });
            }

            if (response.logs) setLogs(response.logs);
          });
      }, STATUS_POOLING_INTERVAL);

      setActiveInterval(newInterval);
    }
  }, [areLogsActive]);

  const areLogsEmpty = logs.length === 0;

  return (
    <VStack position="relative" w="100%" h="100%" align="start" gap={1} overflow="auto">
      {areLogsEmpty && (
        <BodyStrongSmallText color="gray.500" fontFamily="Consolas">
          No logs yet...
        </BodyStrongSmallText>
      )}

      {logs.map((log, index) => (
        <BodyStrongSmallText key={index} fontFamily="Consolas" textAlign="start">
          $ {log}
        </BodyStrongSmallText>
      ))}

      {step.key === AttackStepKey.Finish && (
        <H3Text my={2} color="red.500">
          All infrastructure was destroyed!
        </H3Text>
      )}

      {step.isActive && <Spinner size="sm" position="absolute" top="10px" right="10px" />}
    </VStack>
  );
};

export default AttackConsole;
