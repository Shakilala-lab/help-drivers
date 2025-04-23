"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Car, CreditCard, Gauge, Syringe, Fuel, CalendarIcon } from "lucide-react";
import { writeToSheet } from "@/services/google-sheets";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const dataEntrySchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  mileage: z.string().refine((val) => !isNaN(parseInt(val)), {
    message: "Mileage must be a number.",
  }),
  medicMarkTime: z.string().optional(),
  tachographCardInsertionTime: z.string().optional(),
  fuelFilled: z.string().optional(),
  entryType: z.enum(["morning", "evening", "refueling"]).optional(),
});

function DataEntryForm({ username, carNumber }: { username: string | null, carNumber: string | null }) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof dataEntrySchema>>({
    resolver: zodResolver(dataEntrySchema),
    defaultValues: {
      date: new Date(),
      mileage: "",
      medicMarkTime: "",
      tachographCardInsertionTime: "",
      fuelFilled: "",
      entryType: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof dataEntrySchema>) {
    console.log("Data entry values:", values);
    setIsSubmitted(true);

    try {
      const spreadsheetId = '1CVuIvwFjknaO_2Ajb4ZSo0GDj5vxZu7VsXqvHnrFjzQ';
      const formattedDate = values.date.toLocaleDateString('ru-RU');

      let userData: { [key: string]: string } = {};
      let sheetRange = '';

      if (values.entryType === "refueling") {
        userData = {
          G1: formattedDate,
          H1: values.mileage || "",
          I1: values.fuelFilled || ""
        };
        sheetRange = username!;
      } else if (values.entryType === "morning"){
        userData = {
          A1: formattedDate,
          B1: values.mileage || "",
          C1: values.medicMarkTime || "",
          D1: values.tachographCardInsertionTime || "",
          E1: carNumber || "",
        }
        sheetRange = username!;
      }
       else {
        userData = {
          A1: formattedDate,
          B1: values.mileage || "",          
          D1: values.tachographCardInsertionTime || "",          
          E1: carNumber || "",
        }
        sheetRange = username!;
      }

      if (username) {
        await writeToSheet(spreadsheetId, userData, sheetRange);
      }

      toast({
        title: "Data Saved",
        description: "Your data has been successfully saved to the Google Sheet.",
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "There was an error saving your data. Please try again.",
        variant: "destructive",
      });
      console.error("Error writing to sheet:", error);
    } finally {
      setIsSubmitted(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Обязательная форма для водителей</CardTitle>
        </CardHeader>
        <CardContent>
          <Form control={form.control}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormLabel>Дата <CalendarIcon className="inline-block h-4 w-4 ml-1" /></FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-center font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              new Date(field.value).toLocaleDateString("ru-RU", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            ) : (
                              <span>Выберите дату</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" side="bottom">
                        <Calendar
                          locale="ru"
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entryType"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormLabel>Выбери категорию</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                        <option value="">Выбери действие</option>
                        <option value="morning">Утренние показания</option>
                        <option value="evening">Вечерние показания</option>
                        <option value="refueling">Заправка</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("entryType") === "morning" && (
                <>
                    <FormField
                      control={form.control}
                      name="medicMarkTime"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                          <FormLabel>Восколько поставил отметку медика. <Syringe className="inline-block h-4 w-4 ml-1" /></FormLabel>
                          <FormControl>
                        <Input placeholder="Введите время" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={form.control}
                    name="tachographCardInsertionTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel>Восколько вставил карту тахографа.
                        <CreditCard xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block h-4 w-4 ml-1"><rect width="22" height="16" x="1" y="4" rx="2" ry="2"/><line x1="1" x2="23" y1="10" y2="10"/></CreditCard>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Введите время" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mileage"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel>
                          Показание одоментра <Gauge className="inline-block h-4 w-4 ml-1" />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Введите показания" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </>
              )}

               {form.watch("entryType") === "evening" && (
                <>

                  <FormField
                    control={form.control}
                    name="tachographCardInsertionTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel>Восколько вытащил карту тахографа.
                        <CreditCard xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block h-4 w-4 ml-1"><rect width="22" height="16" x="1" y="4" rx="2" ry="2"/><line x1="1" x2="23" y1="10" y2="10"/></CreditCard>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Введите время" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mileage"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel>
                          Показание одоментра <Gauge className="inline-block h-4 w-4 ml-1" />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Введите показания" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </>
              )}


              {form.watch("entryType") === "refueling" && (
                <>
                   <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                          <FormLabel>
                            Показание одоментра <Gauge className="inline-block h-4 w-4 ml-1" />
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Введите показания" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <FormField
                    control={form.control}
                    name="fuelFilled"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center">
                        <FormLabel>
                          Fuel Filled (liters) <Fuel className="inline-block h-4 w-4 ml-1" />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Введите литры" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Button type="submitte" disabled={isSubmitted} >
                Отправить
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

function DataEntryPageContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username");
  const carNumber = searchParams.get("carNumber");

  return <DataEntryForm username={username} carNumber={carNumber} />;
}

export default function DataEntryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <Suspense fallback={<div>Loading...</div>}>
          <DataEntryPageContent />
        </Suspense>
      </main>
    </div>
  );
}
