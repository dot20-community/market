import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { FC, useState } from "react";

export interface ConfirmModalContext {
  text: string
  isOpen: boolean;
  onOpenChange: () => void;
  onConfirm: () => Promise<void>;
}


export const ConfirmModal: FC<ConfirmModalContext> = ({ text, isOpen, onOpenChange, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Confirmation</ModalHeader>
              <ModalBody>
                <p> 
                  {text}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" isLoading={isLoading} onPress={async () => {
                  setIsLoading(true)
                  try {
                    await onConfirm();
                  } catch (e) {
                    console.log(e)
                  } finally {
                    setIsLoading(false)
                    onClose();
                  }
                }}>
                  Confirm
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
  );
}