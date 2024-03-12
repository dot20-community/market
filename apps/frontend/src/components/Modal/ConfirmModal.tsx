import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { FC } from "react";

export interface ConfirmModalContext {
  isOpen: boolean;
  onOpenChange: () => void;
  onConfirm: () => void;
}


export const ConfirmModal: FC<ConfirmModalContext> = ({ isOpen, onOpenChange, onConfirm }) => {

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Confirmation</ModalHeader>
              <ModalBody>
                <p> 
                  Please confirm that you want to cancel the listing
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={() => {onConfirm();onClose()}}>
                  Confirm
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
  );
}