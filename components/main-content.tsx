"use client"

import { useApp } from "@/contexts/app-context"
import { ChatTool } from "@/components/chat-tool"
import { PlanGenerator } from "@/components/plan-generator"
import { ManualPlanCreator } from "@/components/manual-plan-creator"
import { ModelSettingsPanel } from "@/components/model-settings-panel"
import { SavedPlansView } from "@/components/saved-plans-view"
import { AdminPage } from "@/components/admin-page" // Import the new AdminPage component
import { RenameConversationDialog } from "@/components/rename-conversation-dialog"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

interface MainContentProps {
  planIdToSelect?: string | null
  onPlanSelected?: () => void
}

export function MainContent({ planIdToSelect, onPlanSelected }: MainContentProps = {}) {
  const {
    activeView,
    setActiveView,
    conversations: {
      conversations,
      activeConversationId,
      setActiveConversationId,
      createNewConversation,
      deleteConversation,
      renameConversation,
      updateConversationTitle,
      addMessageToConversation,
      openRenameDialog,
      isDeleteDialogOpen,
      setIsDeleteDialogOpen,
      conversationToModify,
    },
    plans: {
      activePlan,
      teacherName,
      school,
      courseName,
      unit,
      startDate,
      endDate,
      technicalCapabilities,
      socialCapabilities,
      learningType,
      learningActivities,
      files,
      processedFiles,
      handleFileUpload,
      handleProcessFiles,
      generatePlan,
      setTeacherName,
      setSchool,
      setCourseName,
      setUnit,
      setStartDate,
      setEndDate,
      setTechnicalCapabilities,
      setSocialCapabilities,
      setLearningType,
      schedule,
      setSchedule,
      setLearningActivities,
    },
    model,
    setModel,
    temperature,
    setTemperature,
    topP,
    setTopP,
    topK,
    setTopK,
  } = useApp()

  const handleDeleteConfirm = () => {
    if (conversationToModify) {
      deleteConversation(conversationToModify)
    }
    setIsDeleteDialogOpen(false)
  }

  return (
    <>
      {activeView === "chat" && (
        <ChatTool
          conversations={conversations}
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
          createNewConversation={createNewConversation}
          deleteConversation={deleteConversation}
          renameConversation={renameConversation}
          updateConversationTitle={updateConversationTitle}
          addMessageToConversation={addMessageToConversation}
          onNavigateToPlans={() => setActiveView("plan-generator")}
          onNavigateToManualPlan={() => setActiveView("plan-manual")}
          openRenameDialog={openRenameDialog}
        />
      )}

      {activeView === "plan-generator" && (
        <PlanGenerator
          teacherName={teacherName}
          school={school}
          courseName={courseName}
          turma=""
          unit={unit}
          startDate={startDate}
          endDate={endDate}
          technicalCapabilities={technicalCapabilities}
          socialCapabilities={socialCapabilities}
          learningActivities={learningActivities}
          activePlan={activePlan}
          generatePlan={generatePlan}
          files={files}
          onUpload={handleFileUpload}
          onProcess={handleProcessFiles}
          processedFiles={processedFiles}
          setTeacherName={setTeacherName}
          setSchool={setSchool}
          setCourseName={setCourseName}
          setUnit={setUnit}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          setTechnicalCapabilities={setTechnicalCapabilities}
          setSocialCapabilities={setSocialCapabilities}
          setLearningType={setLearningType}
          schedule={schedule}
          setSchedule={setSchedule}
          setLearningActivities={setLearningActivities}
          userId=""
        />
      )}

      {activeView === "plan-manual" && <ManualPlanCreator />}

      {activeView === "settings" && (
        <ModelSettingsPanel
          model={model}
          setModel={setModel}
          temperature={temperature}
          setTemperature={setTemperature}
          topP={topP}
          setTopP={setTopP}
          topK={topK}
          setTopK={setTopK}
        />
      )}

      {activeView === "plan-saved" && (
        <SavedPlansView
          generatePlan={generatePlan}
          planIdToSelect={planIdToSelect}
          onPlanSelected={onPlanSelected}
        />
      )}

      {activeView === "admin" && <AdminPage />}

      <RenameConversationDialog />
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Exclusão"
        description="Tem certeza de que deseja excluir esta conversa? Esta ação não pode ser desfeita."
      />
    </>
  )
}
